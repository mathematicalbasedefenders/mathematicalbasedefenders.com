var router = require("express").Router();

var PendingUser = require("../models/PendingUser.js");
var User = require("../models/User.js");
var Metadata = require("../models/Metadata.js");

const csurf = require("csurf");
const csrfProtection = csurf({ cookie: true });
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const parseForm = bodyParser.urlencoded({ extended: false });
const nodemailer = require("nodemailer");
const mongoDBSanitize = require("express-mongo-sanitize");

const { JSDOM } = require("jsdom");
const defaultWindow = new JSDOM("").window;
const createDOMPurify = require("dompurify");
const DOMPurify = createDOMPurify(defaultWindow);
const { v4: uuidv4 } = require("uuid");

const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

const credentials = require("../credentials/credentials.js");
const log = require("../core/log.js");

router.get("/register", [csrfProtection, limiter], (request, response) => {
    response.cookie("csrfToken", request.csrfToken());
    response.render("pages/register");
});

router.post(
    "/register",
    parseForm,
    [csrfProtection, limiter],
    async (request, response) => {
        const responseKey = DOMPurify.sanitize(
            request.body["g-recaptcha-response"]
        );
        const reCaptchaSecretKey = DOMPurify.sanitize(
            credentials.getReCAPTCHASecretKey()
        );
        const reCaptchaURL = DOMPurify.sanitize(
            `https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecretKey}&response=${responseKey}`
        );

        let desiredUsername = DOMPurify.sanitize(
            mongoDBSanitize.sanitize(request.body.username)
        );
        let desiredEmail = DOMPurify.sanitize(
            mongoDBSanitize.sanitize(request.body.email)
        );
        let desiredUsernameInAllLowercase = DOMPurify.sanitize(
            mongoDBSanitize.sanitize(request.body.username)
        );
        desiredUsernameInAllLowercase = DOMPurify.sanitize(
            desiredUsernameInAllLowercase.toLowerCase()
        );

        // var usernameIsAvailable1 = await schemas.getUserModel().findOne({ username: desiredUsername }).select(desiredUsername);

        var metadataDocument = await Metadata.findOne({
            documentIsMetadata: true
        });

        fetch(reCaptchaURL, { method: "post" })
            .then((response) => response.json())
            .then(async (google_response) => {
                if (!google_response.success) {
                    // registration failed - captcha not completed
                    response.redirect(
                        "?erroroccurred=true&errorreason=captchanotcomplete"
                    );
                    return;
                }

                let errored = false;

                // get information
                let emailIsNotAvailable1 = await User.findOne({
                    emailAddress: desiredEmail
                }).select(desiredEmail);
                let usernameIsNotAvailable1 = await User.findOne({
                    usernameInAllLowercase: desiredUsernameInAllLowercase
                }).select(desiredUsernameInAllLowercase);
                let emailIsNotAvailable2 = await PendingUser.findOne({
                    emailAddress: desiredEmail
                }).select(desiredEmail);
                let usernameIsNotAvailable2 = await PendingUser.findOne({
                    usernameInAllLowercase: desiredUsernameInAllLowercase
                }).select(desiredUsernameInAllLowercase);

                if (usernameIsNotAvailable1 || usernameIsNotAvailable2) {
                    // registration failed - username already taken
                    response.redirect(
                        "?erroroccurred=true&errorreason=usernamealreadytaken"
                    );
                    return;
                }

                if (
                    !/^[0-9a-zA-Z_]+$/.test(desiredUsername) ||
                    desiredUsername.length > 32 ||
                    desiredUsername.length < 3 ||
                    desiredUsername == "" ||
                    desiredUsername == null
                ) {
                    // registration failed - username not valid
                    response.redirect(
                        "?erroroccurred=true&errorreason=usernamenotvalid"
                    );
                    return;
                }

                if (emailIsNotAvailable1 || emailIsNotAvailable2) {
                    // registration failed - email already taken
                    response.redirect(
                        "?erroroccurred=true&errorreason=emailalreadytaken"
                    );
                    return;
                }

                if (
                    !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(
                        desiredEmail
                    ) ||
                    desiredEmail == "" ||
                    desiredEmail == null
                ) {
                    // registration failed - email not valid
                    response.redirect(
                        "?erroroccurred=true&errorreason=emailnotvalid"
                    );
                    return;
                }

                let plaintextPassword = DOMPurify.sanitize(
                    mongoDBSanitize.sanitize(request.body.password)
                );

                if (
                    plaintextPassword.length < 8 ||
                    plaintextPassword.length > 64 ||
                    plaintextPassword == "" ||
                    plaintextPassword == null ||
                    plaintextPassword.includes(" ") ||
                    !/^[0-9a-zA-Z!"#$%&'()*+,-.:;<=>?@^_`{|}~]*$/.test(
                        plaintextPassword
                    )
                ) {
                    response.redirect(
                        "?erroroccurred=true&errorreason=passwordnotvalid"
                    );
                    return;
                }

                let hashedPasswordToSave;
                let emailConfirmationCode;

                await bcrypt.genSalt(16, async (error1, salt) => {
                    if (error1) {
                        response.redirect(
                            "?erroroccurred=true&errorreason=internalerror"
                        );
                        return;
                    } else {
                    
                        await bcrypt.hash(
                            plaintextPassword,
                            salt,
                            (error2, hash) => {
                                if (error2) {
                                    response.redirect(
                                        "?erroroccurred=true&errorreason=internalerror"
                                    );
                                    return;
                                }
                                hashedPasswordToSave = hash;
                                emailConfirmationCode = uuidv4();
                                
                                // create data object (pending user)
                                let dataToSave = {
                                    username: desiredUsername,
                                    usernameInAllLowercase:
                                        desiredUsernameInAllLowercase,
                                    emailAddress: desiredEmail,
                                    hashedPassword: hashedPasswordToSave,
                                    emailConfirmationLink: `https://mathematicalbasedefenders.com/confirm-email-address?email=${desiredEmail}&code=${emailConfirmationCode}`,
                                    emailConfirmationCode:
                                        emailConfirmationCode,
                                    expiresAt: new Date(
                                        Date.now() + 1800000
                                    ).getTime()
                                };

                                let pendingUserModelToSave = new PendingUser(
                                    dataToSave
                                );

                                pendingUserModelToSave.save((error4) => {
                                    if (error4) {
                                        errored = true;
                                        response.redirect(
                                            "?erroroccurred=true&errorreason=internalerror"
                                        );
                                        return;
                                    }
                                });

                                if (errored) return;
                                let transporter = nodemailer.createTransport(
                                    credentials.getNodemailerOptionsObject()
                                );
                                let message = {
                                    from: "Mathematical Base Defenders Support <support@mathematicalbasedefenders.com>",
                                    to: desiredEmail,
                                    subject:
                                        "Email Confirmation for Mathematical Base Defenders",
                                    html: `
                                                            <p>
                                                                Thanks for signing up for Mathematical Base Defenders!
                                                                <br>
                                                                In order to fully activate your account, please click the activation link below.
                                                                <br>
                                                                <a href=https://mathematicalbasedefenders.com/confirm-email-address?email=${DOMPurify.sanitize(
                                                                    desiredEmail
                                                                )}&code=${DOMPurify.sanitize(
                                        emailConfirmationCode
                                    )}>https://mathematicalbasedefenders.com/confirm-email-address?email=${DOMPurify.sanitize(
                                        desiredEmail
                                    )}&code=${DOMPurify.sanitize(
                                        emailConfirmationCode
                                    )}</a>
                                                                <br>
                                                                This link will expire in 30 minutes. After that, your account will be deleted and you may sign up again. If the link doesn't work, feel free to copy and paste the link. If you need help, please reply to this e-mail.
                                                            </p>
                                                            `
                                };
                                transporter.sendMail(
                                    message,
                                    (error, information) => {
                                        if (error) {
                                            console.error(
                                                log.addMetadata(
                                                    error.stack,
                                                    "error"
                                                )
                                            );
                                            response.redirect(
                                                "?erroroccurred=true&errorreason=internalerror"
                                            );
                                            return;
                                        } else {
                                            console.log(
                                                log.addMetadata(
                                                    `Successfully sent verification message to ${desiredUsername}'s e-mail address!`,
                                                    "info"
                                                )
                                            );
                                            console.log(
                                                log.addMetadata(
                                                    "New Unconfirmed User: " +
                                                        desiredUsername,
                                                    "info"
                                                )
                                            );
                                            response.redirect(
                                                "/?registered=true"
                                            );
                                        }
                                    }
                                );
                            }
                        );
                    }
                });
            });
    }
);

module.exports = router;