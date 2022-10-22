import express from "express";
var router = express.Router();

import PendingUser from "../models/PendingUser.js";
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

import { addLogMessageMetadata, LogMessageLevel } from "../core/log.js";

router.get("/confirm-email-address", limiter, async (request, response) => {
  let query: any = url.parse(request.url, true).query; // possibly none
  // let email = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.email));
  // let code = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.code));

  let email = query.email;
  let code = query.code;

  let pendingUserRecord = await PendingUser.findOne({
    emailAddress: email
  }).clone();

  if (pendingUserRecord) {
    if (pendingUserRecord["emailConfirmationCode"] == code) {
      let metadataDocument = await Metadata.findOne({
        documentIsMetadata: true
      }).clone();
      let stringifiedJSON = JSON.stringify(metadataDocument);
      let object = JSON.parse(stringifiedJSON);
      let userCount = object["usersRegistered"];

      console.log(
        addLogMessageMetadata(
          "There are " + userCount + " users registered.",
          LogMessageLevel.INFO
        )
      );

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

      Metadata.findOneAndUpdate(
        { documentIsMetadata: true },
        { $inc: { usersRegistered: 1 } },
        { returnOriginal: false, new: true },
        (error3: any, response3) => {
          if (error3) {
            console.log(
              addLogMessageMetadata(error3.stack, LogMessageLevel.INFO)
            );
            response.redirect("/?erroroccurred=true");
            return;
          } else {
            console.log(
              addLogMessageMetadata(
                "There are now " + (userCount + 1) + " users registered.",
                LogMessageLevel.INFO
              )
            );
            userModelToSave.save((error4: any) => {
              if (error4) {
                console.log(
                  addLogMessageMetadata(error4.stack, LogMessageLevel.INFO)
                );
                response.redirect("/?erroroccurred=true");
                return;
              }
            });
          }
        }
      ).clone();

      console.log(
        addLogMessageMetadata(
          `User ${pendingUserRecord["username"]} validated!`,
          LogMessageLevel.INFO
        )
      );
      PendingUser.deleteOne({ emailAddress: email }, (error: any) => {
        if (error) {
          console.error(
            addLogMessageMetadata(error.stack, LogMessageLevel.ERROR)
          );
        }
      });
      response.redirect("/?verifiedemail=true");
    } else {
      console.log(
        addLogMessageMetadata("Failed to verify a user!", LogMessageLevel.INFO)
      );
      response.redirect("/?erroroccurred=true");
    }
  } else {
    response.redirect("/?erroroccurred=true");
  }
});

export { router };
