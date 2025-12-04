import { sha256 } from "js-sha256";
import log from "../core/log";
import { PendingPasswordReset } from "../models/PendingPasswordReset";
import RepositoryResponse from "../types/RepositoryResponse";
import bcrypt from "bcrypt";
import crypto from "crypto";
import {
  sendMailForPasswordReset,
  sendMailToNewlyRegisteredUser
} from "../services/mail";
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

type PendingPasswordResetData = {
  email: string;
  username: string;
  password: string;
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
      expiresAt: new Date(Date.now() + 1800000).getTime()
    };
    PendingPasswordReset.create(dataToSave);
    const truncatedEmail = data.email.substring(0, 5);
    log.info(
      `Created new pending password reset request for ${truncatedEmail}.`
    );
    return {
      success: true,
      statusCode: 200
    };
  }

  async validateFormData(data: PendingPasswordResetData) {
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

      const isUniqueEmail = await this.checkForDuplicateEmail(data);
      if (!isUniqueEmail) {
        log.warn(
          `Refused to create pending password reset record due to duplicate email.`
        );
        return {
          success: false,
          statusCode: 400,
          error:
            "E-mail already exists. Please check your e-mail for any pending password resets records you may have filed within the past 60 minutes."
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

  async sendMailToUser(
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
    const result = sendMailForPasswordReset(data.email, confirmationCode);
    return result;
  }

  // This both verifies and processes the password reset request for some reason...
  async verifyPendingPasswordReset(
    email: string,
    confirmationCode: string,
    newPassword: string
  ) {
    const user = await this.getPendingPasswordResetRecordDataByCredentials(
      email,
      confirmationCode
    );
    if (!user) {
      log.warn(
        `Refused to verify password reset due to non-existent pending password reset record.`
      );
      return {
        success: false,
        statusCode: 400,
        error: "User to verify's record not found or invalid."
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
      userRepository.changePasswordForEmail(email, hashedPassword);
      this.deletePendingPasswordResetRecord(email, confirmationCode);
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
        { emailConfirmationCode: hashedEmailConfirmationCode }
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
        { emailConfirmationCode: hashedEmailConfirmationCode }
      ]
    });

    const emailPrefix = email.substring(0, 5);
    log.info(
      `Deleted pending password reset record with for email starting with ${emailPrefix}.`
    );
  }

  private async checkCAPTCHA(responseKey: string) {
    const reCaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY as string;
    const sanitizedResponseKey = DOMPurify.sanitize(responseKey);

    const reCaptchaURL = `https://www.google.com/recaptcha/api/siteverify?secret=${reCaptchaSecretKey}&response=${sanitizedResponseKey}`;

    const fetchResponse = await fetch(reCaptchaURL, { method: "POST" });
    const fetchResponseJSON = await fetchResponse.json();

    return fetchResponseJSON.success;
  }
}

export { PendingPasswordResetRepository };
