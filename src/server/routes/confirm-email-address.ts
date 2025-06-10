import express from "express";
var router = express.Router();

import { PendingUser, PendingUserInterface } from "../models/PendingUser.js";
import { User, UserInterface } from "../models/User";
import Metadata from "../models/Metadata.js";

const sha256 = require("js-sha256");

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
  const code = getDataFromQueryString(request);

  if (!code) {
    log.warn(`Invalid code supplied while verifying! (${code})`);
    response.redirect("/?activated=false");
    return;
  }

  let pendingUserRecord;
  try {
    pendingUserRecord = await getPendingUser(code);
  } catch (error) {
    log.error("Error retrieving pending user record:", error);
    response.redirect("/?activated=false");
    return;
  }

  if (!pendingUserRecord) {
    log.warn(`Pending user record not found! (${code})`);
    response.redirect("/?activated=false");
    return;
  }

  try {
    // get user count
    const userCount = await getUserCount();
    if (userCount === -1) {
      log.error("Unable to get metadata document. User not verified.");
      response.redirect("/?activated=false");
      return;
    }

    // create user
    const dataToSave = createUserObject(pendingUserRecord, userCount);

    // save user
    const userModelToSave = new User(dataToSave);
    await userModelToSave.save();
    log.info(`User ${pendingUserRecord["username"]} validated!`);

    // delete pending user record
    const email = pendingUserRecord.emailAddress;
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
  response.render("pages/confirm-email-address-complete");
});

function getDataFromQueryString(request: express.Request) {
  function sanitizeString(what: any) {
    const databaseSanitized = mongoDBSanitize.sanitize(what) as string;
    return DOMPurify.sanitize(databaseSanitized);
  }

  const parsedURL = url.parse(request.url, true); // possibly none
  const query = parsedURL.query;
  if (query == null) {
    return null;
  }
  // // get email
  // const uriDecodedEmail: any = decodeURIComponent(query.email) as string;
  // // sanitize email
  // const email: string =
  //   DOMPurify.sanitize(mongoDBSanitize.sanitize(uriDecodedEmail)) ?? null;
  // // get code
  // const code: string =
  //   DOMPurify.sanitize(mongoDBSanitize.sanitize(query.code)) ?? null;

  const rawEmail = query.email as string;
  const decodedEmail = rawEmail ? decodeURIComponent(rawEmail.trim()) : null;
  const sanitizedEmail = sanitizeString(decodedEmail) ?? null;

  const rawCode = query.code as string;
  const decodedCode = rawCode ? decodeURIComponent(rawCode.trim()) : null;
  const sanitizedCode = sanitizeString(decodedCode) ?? null;

  return sanitizedCode;
}

async function getPendingUser(code: string) {
  const hashedCode = sha256(code);
  const user = await PendingUser.findOne({
    $and: [{ emailConfirmationCode: hashedCode }]
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
  const userCount = metadataDocument?.usersRegistered || -1;
  return userCount;
}

async function deletePendingUserRecord(email: string) {
  try {
    await PendingUser.deleteOne({ emailAddress: email }).clone();
    log.info("Deleted pending user record (user verified).");
    return true;
  } catch (error) {
    log.error("Pending user record deletion error");
    log.error(error);
    return false;
  }
}

async function updateMetadata() {
  const updatedMetadata = await Metadata.findOneAndUpdate(
    { documentIsMetadata: true },
    { $inc: { usersRegistered: 1 } },
    { returnDocument: "after" }
  ).clone();
  const userCount = updatedMetadata?.usersRegistered || "an unknown number of";
  log.info("There are now " + userCount + " users registered.");
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
