var router = require("express").Router();

const csurf = require("csurf");
const csrfProtection = csurf({ cookie: true });
const bodyParser = require("body-parser");
const parseForm = bodyParser.urlencoded({ extended: false });

const mongoDBSanitize = require("express-mongo-sanitize");

const UserService = require("../services/user.js");
const MailService = require("../services/mail.js");


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

      process.env.RECAPTCHA_SECRET_KEY

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
    let plaintextPassword = DOMPurify.sanitize(
      mongoDBSanitize.sanitize(request.body.password)
    );
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

        let validationResult = await UserService.validateNewUserInformation(
          desiredUsername,
          desiredEmail,
          plaintextPassword
        );

        if (!validationResult.success) {
          response.redirect(validationResult.redirectTo);
          return;
        }

        let dataWriteResult = await UserService.addUnverifiedUser(
          desiredUsername,
          desiredEmail,
          plaintextPassword
        );

        if (!dataWriteResult.success) {
          response.redirect(dataWriteResult.redirectTo);
          return;
        }

        let mailResult = await MailService.sendMailToUnverifiedUser(
          desiredUsername, desiredEmail, dataWriteResult.emailConfirmationCode
        )

        if (!mailResult.ok){
          response.redirect(mailResult.redirectTo);
          return;
        }

        let hashedPasswordToSave;
        let emailConfirmationCode;

        await bcrypt.genSalt(16, async (error1, salt) => {
          if (error1) {
            response.redirect("?erroroccurred=true&errorreason=internalerror");
            return;
          } else {
            await bcrypt.hash(plaintextPassword, salt, (error2, hash) => {
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
                usernameInAllLowercase: desiredUsernameInAllLowercase,
                emailAddress: desiredEmail,
                hashedPassword: hashedPasswordToSave,
                emailConfirmationLink: `https://mathematicalbasedefenders.com/confirm-email-address?email=${desiredEmail}&code=${emailConfirmationCode}`,
                emailConfirmationCode: emailConfirmationCode,
                expiresAt: new Date(Date.now() + 1800000).getTime()
              };

              let pendingUserModelToSave = new PendingUser(dataToSave);

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
                mail.getNodemailerOptionsObject()
              );
              let message = mail.getMailContentForNewlyRegisteredUser(desiredEmail, emailConfirmationCode);
              transporter.sendMail(message, (error, information) => {
                if (error) {
                  console.error(log.addMetadata(error.stack, "error"));
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
                      "New Unconfirmed User: " + desiredUsername,
                      "info"
                    )
                  );
                  response.redirect("/?registered=true");
                }
              });

            });
          }
        });
        response.redirect(mailResult.redirectTo);
        return;

      });
  }
);

module.exports = router;
