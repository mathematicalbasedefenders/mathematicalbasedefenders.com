var router = require("express").Router();

var PendingUser = require("../models/PendingUser.js");
var User = require("../models/User.js");
var Metadata = require("../models/Metadata.js");

const url = require("url");
const { JSDOM } = require("jsdom");
const defaultWindow = new JSDOM("").window;
const createDOMPurify = require("dompurify");
const DOMPurify = createDOMPurify(defaultWindow);
const { v4: uuidv4 } = require("uuid");
const mongoDBSanitize = require("express-mongo-sanitize");

const log = require("../server/core/log.js")


router.get("/confirm-email-address", async (request, response) => {
    
    let query = url.parse(request.url, true).query;
    let email = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.email));
    let code = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.code));

    let pendingUserRecord = await PendingUser.findOne({
        emailAddress: email
    });

    if (pendingUserRecord) {
        if (pendingUserRecord["emailConfirmationCode"] == code) {
            let metadataDocument = await Metadata.findOne({documentIsMetadata: true});
            let stringifiedJSON = JSON.stringify(metadataDocument);
            let object = JSON.parse(stringifiedJSON);
            let userCount = object["usersRegistered"];

            console.log(
                log.addMetadata(
                    "There are " + userCount + " users registered.",
                    "info"
                )
            );

            let dataToSave = {
                username: pendingUserRecord["username"],
                usernameInAllLowercase:
                    pendingUserRecord["usernameInAllLowercase"],
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

            let userModelToSave =
                new User(dataToSave);

            Metadata.findOneAndUpdate(
                { documentIsMetadata: true },
                { $inc: { usersRegistered: 1 } },
                { returnOriginal: false, new: true },
                (error3, response3) => {
                    if (error3) {
                        console.log(log.addMetadata(error3, "info"));
                        response.redirect("/?erroroccurred=true");
                        return;
                    } else {
                        console.log(
                            log.addMetadata(
                                "There are now " +
                                    (userCount + 1) +
                                    " users registered.",
                                "info"
                            )
                        );
                        userModelToSave.save((error4) => {
                            if (error4) {
                                console.log(log.addMetadata(error4, "info"));
                                response.redirect("/?erroroccurred=true");
                                return;
                            }
                        });
                    }
                }
            );

            console.log(
                log.addMetadata(
                    `User ${pendingUserRecord["username"]} validated!`,
                    "info"
                )
            );
            PendingUser.deleteOne({ emailAddress: email }, (error) => {
                if (error) {
                    console.error(log.addMetadata(error.stack, "error"));
                }
            });
            response.redirect("/?verifiedemail=true");
        } else {
            console.log(log.addMetadata("Failed to verify a user!", "info"));
            response.redirect("/?erroroccurred=true");
        }
    } else {
        response.redirect("/?erroroccurred=true");
    }
});

module.exports = router;