var router = require("express").Router();
var Metadata = require("../models/Metadata.js");

const url = require("url");
const csurf = require("csurf");
const csrfProtection = csurf({ cookie: true });
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const parseForm = bodyParser.urlencoded({ extended: false });
const mongoDBSanitize = require("express-mongo-sanitize");
const { JSDOM } = require("jsdom");
const defaultWindow = new JSDOM("").window;
const createDOMPurify = require("dompurify");
const DOMPurify = createDOMPurify(defaultWindow);
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});
const log = require("../server/core/log.js");


var User = require("../models/User.js");
var PendingPasswordReset = require("../models/PendingPasswordReset.js");


router.get("/change-password", [csrfProtection, limiter], async (request, response) => {
    response.cookie("csrfToken", request.csrfToken());
    let query = url.parse(request.url, true).query;
    let email = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.email));
    let code = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.code));
    var pendingPasswordResetRecord = await PendingPasswordReset.findOne({
        emailAddress: email
    });

    if (pendingPasswordResetRecord) {
        if (
            pendingPasswordResetRecord["passwordResetConfirmationCode"] == code
        ) {
            response.render("pages/change-password");
        } else {
            response.redirect("/?erroroccurred=true");
        }
    } else {
        response.redirect("/?erroroccurred=true");
    }
});

router.post(
    "/change-password",
    parseForm,
    [csrfProtection, limiter],
    async (request, response) => {
        let query = url.parse(request.url, true).query;
        let email = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.email));
        let code = DOMPurify.sanitize(mongoDBSanitize.sanitize(query.code));
        let newPassword = DOMPurify.sanitize(
            mongoDBSanitize.sanitize(request.body.password)
        );
        let confirmNewPassword = DOMPurify.sanitize(
            mongoDBSanitize.sanitize(request.body["confirm-password"])
        );

        let record = await PendingPasswordReset.find({
            $and: [{ emailAddress: email }, { code: code }]
        });

        if (record) {
            if (
                !(
                    newPassword.length < 8 ||
                    newPassword.length > 64 ||
                    newPassword == "" ||
                    newPassword == null ||
                    newPassword.includes(" ") ||
                    !/^[0-9a-zA-Z!"#%&'()*+,-.:;<=>?@^_`{|}~]*$/.test(
                        newPassword
                    ) ||
                    newPassword != confirmNewPassword
                )
            ) {
                bcrypt.genSalt(16, function (error1, salt) {
                    if (error1) {
                        console.error(log.addMetadata(error1.stack, "error"));
                        response.redirect("/?erroroccurred=true");
                    } else {
                        bcrypt.hash(
                            newPassword,
                            salt,
                            async function (error2, hash) {
                                if (error2) {
                                    console.error(
                                        log.addMetadata(error2.stack, "error")
                                    );
                                    response.redirect("/?erroroccurred=true");
                                } else {
                                    PendingPasswordReset.deleteOne(
                                        { emailAddress: email },
                                        (error3, response3) => {
                                            if (error3) {
                                                console.error(
                                                    log.addMetadata(
                                                        error3.stack,
                                                        "error"
                                                    )
                                                );
                                                response.redirect(
                                                    "/?erroroccurred=true"
                                                );
                                            } else {
                                                User
                                                    .findOneAndUpdate(
                                                        { emailAddress: email },
                                                        {
                                                            hashedPassword: hash
                                                        },
                                                        {
                                                            useFindAndModify: true,
                                                            new: true
                                                        },
                                                        (error, response2) => {
                                                            if (error) {
                                                                console.error(
                                                                    log.addMetadata(
                                                                        error.stack,
                                                                        "error"
                                                                    )
                                                                );
                                                                response.redirect(
                                                                    "/?erroroccurred=true"
                                                                );
                                                            } else {
                                                                console.log(
                                                                    log.addMetadata(
                                                                        "Successfully changed password for a user!",
                                                                        "info"
                                                                    )
                                                                );
                                                                response.redirect(
                                                                    "/?changedPassword=true"
                                                                );
                                                            }
                                                        }
                                                    );
                                            }
                                        }
                                    );
                                }
                            }
                        );
                    }
                });
            } else {
                response.redirect("/?erroroccurred=true");
            }
        } else {
            response.redirect("/?erroroccurred=true");
        }
    }
);

module.exports = router;