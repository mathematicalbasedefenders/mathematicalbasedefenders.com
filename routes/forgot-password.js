var router = require("express").Router();
var Metadata = require("../models/Metadata.js");
var User = require("../models/User.js");
var PendingPasswordReset = require("../models/PendingPasswordReset.js");


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

const credentials = require("../credentials/credentials.js");
const log = require("../server/core/log.js");


router.get("/forgot-password", csrfProtection, async (request, response) => {
    response.cookie("csrfToken", request.csrfToken());
    response.render("pages/forgot-password");
});

router.post(
    "/forgot-password",
    parseForm,
    csrfProtection,
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

        let desiredEmail = DOMPurify.sanitize(
            mongoDBSanitize.sanitize(request.body.email)
        );
        let passwordResetConfirmationCode = DOMPurify.sanitize(uuidv4());

        let playerData = await User.findOne({
            emailAddress: desiredEmail
        });

        if (playerData) {
            fetch(reCaptchaURL, { method: "post" })
                .then((response) => response.json())
                .then((google_response) => {
                    if (google_response.success == true) {
                        let dataToSave = {
                            emailAddress: desiredEmail,
                            passwordResetConfirmationLink: `https://mathematicalbasedefenders.com/change-password?email=${desiredEmail}&code=${passwordResetConfirmationCode}`,
                            passwordResetConfirmationCode:
                                passwordResetConfirmationCode,
                            expiresAt: new Date(Date.now() + 1800000).getTime()
                        };
                        let pendingPasswordResetToSave =
                            new PendingPasswordReset(dataToSave);
                        pendingPasswordResetToSave.save((error4) => {
                            if (error4) {
                                console.log(
                                    log.addMetadata(error4.stack, "info")
                                );
                                response.redirect("/?resetpassword=fail");
                            } else {
                                let transporter = nodemailer.createTransport(
                                    credentials.getNodemailerOptionsObject()
                                );
                                let message = {
                                    from: "Mathematical Base Defenders Support <support@mathematicalbasedefenders.com>",
                                    to: desiredEmail,
                                    subject:
                                        "Password Reset Confirmation for Mathematical Base Defenders",
                                    html: `
							<p>
								Someone requested a password reset for your Mathematical Base Defenders account.
								<br>
								If this is you, and you want continue with the procedure, please click this link.
								<br>
								<a href=https://mathematicalbasedefenders.com/change-password/?email={desiredEmail}?code=${DOMPurify.sanitize(
                                    passwordResetConfirmationCode
                                )}>https://mathematicalbasedefenders.com/change-password?email=${DOMPurify.sanitize(
                                        desiredEmail
                                    )}&code=${DOMPurify.sanitize(
                                        passwordResetConfirmationCode
                                    )}</a>
								<br>
								This link will expire in 30 minutes. After that, you may request a new password reset link. If the link doesn't work, feel free to copy and paste the link. If you need help, please reply to this e-mail.
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
                                                "?erroroccurred=true"
                                            );
                                        } else {
                                            response.redirect(
                                                "/?sentpasswordresetlink=true"
                                            );
                                        }
                                    }
                                );
                            }
                        });
                    } else {
                        response.redirect("?resetpassword=fail");
                    }
                });
        } else {
            console.error(
                log.addMetadata(
                    `No user with e-mail address ${desiredEmail} found!`,
                    "error"
                )
            );
            response.redirect("?erroroccurred=true");
        }
    }
);

module.exports = router;