import express from "express";
var router = express.Router();

import { PendingUser, PendingUserInterface } from "../models/PendingUser.js";
import { User, UserInterface } from "../models/User";
import Metadata from "../models/Metadata.js";

import url from "url";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
const window: any = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);
import { v4 as uuidv4 } from "uuid";
import mongoDBSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

import { log } from "../core/log.js";

router.get("/confirm-email-address", limiter, async (request, response) => {
  const [email, code] = getDataFromQueryString(request);

  if (!email || !code) {
    log.warn(`Invalid e-mail and/or code supplied while verifying! (${code})`);
    response.redirect("/?activated=false");
    return;
  }

  const pendingUserRecord = await getPendingUser(email, code);

  if (!pendingUserRecord) {
    log.warn(`Pending user record not found! (${code})`);
    response.redirect("/?activated=false");
    return;
  }

  try {
    // get user count
    const userCount = await getUserCount();

    // create user
    const dataToSave = createUserObject(pendingUserRecord, userCount);

    // save user
    const userModelToSave = new User(dataToSave);
    await userModelToSave.save();
    log.info(`User ${pendingUserRecord["username"]} validated!`);

    // delete pending user record
    await deletePendingUserRecord(email);

    // update metadata
    await updateMetadata();
  } catch (error) {
    if (error instanceof Error) {
      log.error("Error while user validation:");
      log.error(error.stack);
    } else {
      log.error(`Unknown user validation error: ${error}`);
    }
    response.redirect("/?activated=false");
    return;
  }

  log.info(`User activation for ${pendingUserRecord["username"]} OK!`);
  response.redirect("/?activated=true");
});

function getDataFromQueryString(request: any) {
  const query: any = url.parse(request.url, true).query; // possibly none
  if (query == null) {
    return [null, null];
  }
  // get email
  const uriDecodedEmail: any = decodeURIComponent(query.email) as string;
  // sanitize email
  const email: string =
    DOMPurify.sanitize(mongoDBSanitize.sanitize(uriDecodedEmail)) ?? null;
  // get code
  const code: string =
    DOMPurify.sanitize(mongoDBSanitize.sanitize(query.code)) ?? null;
  return [email, code];
}

async function getPendingUser(email: string, code: string) {
  const user = await PendingUser.findOne({
    $and: [{ emailAddress: email }, { emailConfirmationCode: code }]
  }).clone();
  return user;
}

/**
 * Gets the total user count from the database's metadata document.
 * FIXME: This may not be 100% accurate.
 * Additionally, this makes 1 extra DB request.
 */
async function getUserCount() {
  const metadataDocument = await Metadata.findOne({
    documentIsMetadata: true
  }).clone();
  const stringifiedJSON = JSON.stringify(metadataDocument);
  const object = JSON.parse(stringifiedJSON);
  const userCount = object["usersRegistered"];
  return userCount;
}

async function deletePendingUserRecord(email: string) {
  PendingUser.deleteOne({ emailAddress: email }, (error) => {
    if (error instanceof Error) {
      log.error("Pending user record deletion error");
      log.error(error.stack);
      return false;
    }
  });
  log.error("Deleted pending user record (user verified).");
  return true;
}

async function updateMetadata() {
  const metadataDocument = await Metadata.findOne({
    documentIsMetadata: true
  }).clone();
  const stringifiedJSON = JSON.stringify(metadataDocument);
  const object = JSON.parse(stringifiedJSON);
  const userCount = object["usersRegistered"];
  await Metadata.findOneAndUpdate(
    { documentIsMetadata: true },
    { $inc: { usersRegistered: 1 } },
    { returnOriginal: false, new: true }
  ).clone();
  log.info("There are now " + (userCount + 1) + " users registered.");
}

function createUserObject(
  pendingUserRecord: PendingUserInterface,
  userCount: number
) {
  const dataToSave = {
    username: pendingUserRecord["username"],
    usernameInAllLowercase: pendingUserRecord["usernameInAllLowercase"],
    emailAddress: pendingUserRecord["emailAddress"],
    hashedPassword: pendingUserRecord["hashedPassword"],
    userNumber: userCount + 1,
    creationDateAndTime: Date.now(),
    statistics: {
      gamesPlayed: 0
    },
    membership: {
      isDeveloper: false,
      isAdministrator: false,
      isModerator: false,
      isContributor: false,
      isTester: false,
      isDonator: false,
      specialRank: ""
    }
  };
  return dataToSave;
}

export { router };
