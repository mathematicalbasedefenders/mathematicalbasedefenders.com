import { sha256 } from "js-sha256";
import log from "../core/log";
import { PendingPasswordReset } from "../models/PendingPasswordReset";
import RepositoryResponse from "../types/RepositoryResponse";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendMailForPasswordReset } from "../services/mail";
import UserRepository from "./UserRepository";
import CAPTCHAData from "../types/CAPTCHAData";
import ExpressMongoSanitize from "express-mongo-sanitize";

import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+){1,256}$/;
const PASSWORD_REGEX = /^[0-9a-zA-Z!"#$%&'()*+,-.:;<=>?@^_`{|}~]{8,48}$/;
const USER_ID_REGEX = /^[0-9a-f]{24}$/;

type PendingPasswordResetData = {
  email: string;
};

export default class PendingPasswordResetRepository {
  async createPendingPasswordResetRecord(
    data: PendingPasswordResetData & CAPTCHAData
  ): Promise<RepositoryResponse> {
    const captchaResponse = data["g-recaptcha-response"] ?? "";
    const captchaResult = await this.checkCAPTCHA(captchaResponse);
    if (!captchaResult) {
      log.warn(
        `Refused to create pending password reset record due to incomplete CAPTCHA.`
      );
      return {
        success: false,
        statusCode: 400,
        error: "CAPTCHA not completed."
      };
    }

    const validationResult = await this.validateFormData(data);
    if (!validationResult.success) {
      return {
        success: false,
        statusCode: validationResult.statusCode,
        error: validationResult.error
      };
    }

    data.email = data.email.toLowerCase();

    /**
     * Returns a (fake) successful response if there is no user with the e-mail
     * `data.email` for security reasons and to prevent abuse as well.
     */
    const userRepository = new UserRepository();
    const existing = await userRepository.getUserDataByEmail(data.email);
    if (!existing) {
      const shortenedEmail = data.email.substring(0, 5);
      log.info(
        `Refused to create password reset request due to no user with email ${shortenedEmail}`
      );
      log.info(`But returning a fake successful 200 response.`);
      return {
        success: true,
        statusCode: 200
      };
    }

    /**
     * Returns a (fake) successful response if there is already an active
     * `data.email` for security reasons and to prevent abuse as well.
     */
    const isUniqueEmail = await this.checkForDuplicateEmail(data);
    if (!isUniqueEmail) {
      log.warn(
        `Refused to create pending password reset record due to duplicate email.`
      );
      log.info(`But returning a fake successful 200 response.`);
      return {
        success: true,
        statusCode: 200
      };
    }

    // const hashedPassword = await this.hashPassword(data);
    const emailConfirmationCode = this.createEmailConfirmationCode();
    const hashedEmailConfirmationCode = sha256(emailConfirmationCode);

    const mailResult = await this.sendMailToUser(data, emailConfirmationCode);
    if (!mailResult) {
      log.error(`Refused to create pending user due to unable to send mail.`);
      return {
        success: false,
        statusCode: 400,
        error:
          "Unable to send mail. (Contact the server administrator if this persists.)"
      };
    }

    // here because for some reason the `+`s in an emails are replaced with spaces.
    const encodedEmail = data.email.replaceAll("+", "%2B");

    const dataToSave = {
      emailAddress: data.email,
      passwordResetConfirmationLink: `https://mathematicalbasedefenders.com/change-password?email=${encodedEmail}&code=${emailConfirmationCode}`,
      passwordResetConfirmationCode: hashedEmailConfirmationCode,
      userID: existing._id,
      expiresAt: new Date(Date.now() + 1800000).getTime()
    };

    await PendingPasswordReset.create(dataToSave);

    const truncatedEmail = data.email.substring(0, 5);
    log.info(
      `Created new pending password reset request for ${truncatedEmail}.`
    );
    return {
      success: true,
      statusCode: 200
    };
  }

  async checkPasswordResetRecordExistence(email: string, code: string) {
    const decodedEmail = decodeURIComponent(email).toLowerCase();
    const decodedCode = decodeURIComponent(code);

    const record = await this.getPendingPasswordResetRecordDataByCredentials(
      decodedEmail,
      decodedCode
    );

    if (!record) {
      return {
        success: false,
        statusCode: 404,
        error: "Not Found"
      };
    }

    return {
      success: true,
      statusCode: 200,
      data: {
        userID: record.userID
      }
    };
  }

  private async validateFormData(data: PendingPasswordResetData) {
    try {
      if (!data.email) {
        log.warn(
          `Refused to create pending password reset record due to empty email.`
        );
        return {
          success: false,
          statusCode: 400,
          error: "Empty e-mail field."
        };
      }

      if (ExpressMongoSanitize.has([data.email], true)) {
        log.warn(
          `Refused to create pending password reset record due to potentially insecure email.`
        );
        return {
          success: false,
          statusCode: 400,
          error:
            "Invalid e-mail format. (E-mail contains special characters that may not work with implementation.)"
        };
      }

      if (!this.validatePendingEmail(data)) {
        log.warn(
          `Refused to create pending password reset record due to invalid email.`
        );
        return {
          success: false,
          statusCode: 400,
          error: "Invalid e-mail format."
        };
      }

      return {
        statusCode: 200,
        success: true
      };
    } catch (error) {
      log.error(`Error while validating user: ${error}`);
      return {
        statusCode: 500,
        success: false,
        error: "Internal Server Error."
      };
    }
  }

  validatePendingEmail(data: PendingPasswordResetData) {
    const email = data.email;
    return EMAIL_REGEX.test(email);
  }

  validateNewPassword(password: string) {
    return PASSWORD_REGEX.test(password);
  }

  async checkForDuplicateEmail(data: PendingPasswordResetData) {
    const pendingExisting =
      await this.checkPendingPasswordResetRecordExistenceByEmail(data.email);
    return !pendingExisting;
  }

  createEmailConfirmationCode() {
    const result = crypto.randomUUID();
    return result;
  }

  async hashPassword(plaintextPassword: string) {
    const salt = await bcrypt.genSalt(13);
    const hashedPassword = await bcrypt.hash(plaintextPassword, salt);
    return hashedPassword;
  }

  private async sendMailToUser(
    data: PendingPasswordResetData,
    confirmationCode: string
  ) {
    if (process.env.CREDENTIAL_SET_USED !== "production") {
      const truncatedEmail = data.email.substring(0, 5);
      log.warn(`Using testing credentials when sending mail.`);
      log.warn(
        `Mail to pending password reset request ${truncatedEmail} not sent.`
      );
      log.debug(`Confirmation code is: ${confirmationCode}`);
      return true;
    }
    const result = await sendMailForPasswordReset(data.email, confirmationCode);
    return result;
  }

  // This both verifies and processes the password reset request for some reason...
  async verifyPendingPasswordReset(
    userID: string,
    email: string,
    confirmationCode: string,
    newPassword: string,
    confirmNewPassword: string
  ) {
    if (!USER_ID_REGEX.test(userID)) {
      log.warn(`Request to change password failed: Invalid user ID.`);
      return {
        success: false,
        error: "Invalid credentials.",
        statusCode: 400
      };
    }

    if (typeof email !== "string") {
      log.warn(`Request to change password failed: Invalid e-mail type.`);
      return {
        success: false,
        error: "Invalid credentials.",
        statusCode: 400
      };
    }

    if (typeof confirmationCode !== "string") {
      log.warn(`Request to change password failed: Invalid code type.`);
      return {
        success: false,
        error: "Invalid credentials.",
        statusCode: 400
      };
    }

    const decodedEmail = decodeURIComponent(email).toLowerCase();
    const decodedCode = decodeURIComponent(confirmationCode);

    const user = await this.getPendingPasswordResetRecordDataByCredentials(
      decodedEmail,
      decodedCode
    );

    if (!user) {
      log.warn(
        `Refused to verify password reset due to non-existent pending password reset record.`
      );
      return {
        success: false,
        statusCode: 400,
        error: "User to reset password's record not found or invalid."
      };
    }

    if (user.userID !== userID) {
      log.warn(`Refused to verify password reset due user IDs not matching.`);
      return {
        success: false,
        statusCode: 400,
        error: "User to reset password's record not found or invalid."
      };
    }

    if (newPassword !== confirmNewPassword) {
      log.warn(
        `Refused to verify password reset due to passwords not matching.`
      );
      return {
        success: false,
        statusCode: 400,
        error: "New password and confirmation doesn't match."
      };
    }

    const passwordValidationResult = this.validateNewPassword(newPassword);
    if (!passwordValidationResult) {
      log.warn(
        `Refused to verify password reset due to invalid new password format.`
      );
      return {
        success: false,
        statusCode: 400,
        error: "New password is in an invalid format."
      };
    }

    const hashedPassword = await this.hashPassword(newPassword);

    try {
      const userRepository = new UserRepository();
      await userRepository.changePasswordForEmail(decodedEmail, hashedPassword);
      await this.deletePendingPasswordResetRecord(decodedEmail, decodedCode);
    } catch (error) {
      log.error(`Error while fulfilling pending password reset: ${error}`);
      return {
        statusCode: 500,
        success: false,
        error: "Internal Server Error."
      };
    }

    log.info(`Changed password for user with email: ${email.substring(0, 5)}`);
    return {
      success: true,
      statusCode: 200
    };
  }

  private async checkPendingPasswordResetRecordExistenceByEmail(email: string) {
    const existing = await PendingPasswordReset.findOne({
      emailAddress: email
    }).count();
    return existing > 0;
  }

  private async getPendingPasswordResetRecordDataByCredentials(
    email: string,
    confirmationCode: string
  ) {
    const hashedEmailConfirmationCode = sha256(confirmationCode);
    const pendingPasswordResetRecord = await PendingPasswordReset.findOne({
      $and: [
        { emailAddress: email },
        { passwordResetConfirmationCode: hashedEmailConfirmationCode }
      ]
    })
      .clone()
      .lean();
    return pendingPasswordResetRecord;
  }

  /**
   * Use when e.g. a pending password reset request is fulfilled.
   */
  private async deletePendingPasswordResetRecord(
    email: string,
    confirmationCode: string
  ) {
    const hashedEmailConfirmationCode = sha256(confirmationCode);
    await PendingPasswordReset.findOneAndDelete({
      $and: [
        { emailAddress: email },
        { passwordResetConfirmationCode: hashedEmailConfirmationCode }
      ]
    });

    const emailPrefix = email.substring(0, 5);
    log.info(
      `Deleted pending password reset record with for email starting with ${emailPrefix}.`
    );
  }

  private async checkCAPTCHA(responseKey: string) {
    if (process.env.CREDENTIAL_SET_USED !== "production") {
      log.warn(`Bypassing CAPTCHA check due to using testing credentials.`);
      return true;
    }

    const reCaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY as string;
    const sanitizedResponseKey = DOMPurify.sanitize(responseKey);

    const reCaptchaURL = `https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecretKey}&response=${sanitizedResponseKey}`;

    const fetchResponse = await fetch(reCaptchaURL, { method: "POST" });
    const fetchResponseJSON = await fetchResponse.json();

    return fetchResponseJSON.success;
  }
}

export { PendingPasswordResetRepository };
