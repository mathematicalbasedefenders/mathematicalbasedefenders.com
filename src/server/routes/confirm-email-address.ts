import express from "express";
var router = express.Router();

import { PendingUser } from "../models/PendingUser.js";
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
  let query: any = url.parse(request.url, true).query; // possibly none

  let uriDecodedEmail: any = decodeURIComponent(query.email) as string;

  let email: string = DOMPurify.sanitize(
    mongoDBSanitize.sanitize(uriDecodedEmail)
  );
  let code: string = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.code));

  let pendingUserRecord = await PendingUser.findOne({
    emailAddress: email
  }).clone();

  if (
    pendingUserRecord &&
    pendingUserRecord["emailConfirmationCode"] === code
  ) {
    try {
      let metadataDocument = await Metadata.findOne({
        documentIsMetadata: true
      }).clone();
      let stringifiedJSON = JSON.stringify(metadataDocument);
      let object = JSON.parse(stringifiedJSON);
      let userCount = object["usersRegistered"];

      let dataToSave = {
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
          isTester: true,
          isDonator: false,
          specialRank: ""
        }
      };

      let userModelToSave = new User(dataToSave);

      await Metadata.findOneAndUpdate(
        { documentIsMetadata: true },
        { $inc: { usersRegistered: 1 } },
        { returnOriginal: false, new: true }
      ).clone();
      log.info("There are now " + (userCount + 1) + " users registered.");
      await userModelToSave.save();

      log.info(`User ${pendingUserRecord["username"]} validated!`);
      PendingUser.deleteOne({ emailAddress: email }, (error) => {
        if (error instanceof Error) {
          log.error(error.stack);
        } else {
          log.error(`Unknown pending user validation error: ${error}`);
        }
      });
      response.redirect("/?verifiedemail=true");

      return;
    } catch (error) {
      if (error instanceof Error) {
        log.error(error.stack);
      } else {
        log.error(`Unknown license error: ${error}`);
      }
      response.redirect("/?erroroccurred=true");
      return;
    }
  } else {
    log.error(`No user with verification code ${code} found!`);
    response.redirect("/?erroroccurred=true");
    return;
  }
});

export { router };
