import { sha256 } from "js-sha256";
import log from "../core/log";
import { PendingUser } from "../models/PendingUser";
import RepositoryResponse from "../types/RepositoryResponse";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendMailToNewlyRegisteredUser } from "../services/mail";
import UserRepository from "./UserRepository";
import CAPTCHAData from "../types/CAPTCHAData";
import ExpressMongoSanitize from "express-mongo-sanitize";

import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
import MetadataRepository from "./MetadataRepository";
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+){1,256}$/;
const USERNAME_REGEX = /^[A-Za-z0-9_\-]{3,20}$/;
const PASSWORD_REGEX = /^[0-9a-zA-Z!"#$%&'()*+,-.:;<=>?@^_`{|}~]{8,48}$/;

type PendingUserData = {
  email: string;
  username: string;
  password: string;
};

export default class PendingUserRepository {
  async createPendingUser(
    data: PendingUserData & CAPTCHAData
  ): Promise<RepositoryResponse> {
    const captchaResponse = data["g-recaptcha-response"] ?? "";
    const captchaResult = await this.checkCAPTCHA(captchaResponse);
    if (!captchaResult) {
      log.warn(`Refused to create pending user due to incomplete CAPTCHA.`);
      return {
        success: false,
        statusCode: 400,
        error: "CAPTCHA not completed."
      };
    }

    data.email = data.email.toLowerCase();

    const validationResult = await this.validateUserData(data);
    if (!validationResult.success) {
      return {
        success: false,
        statusCode: validationResult.statusCode,
        error: validationResult.error
      };
    }

    const hashedPassword = await this.hashPassword(data);
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
      username: data.username,
      usernameInAllLowercase: data.username.toLowerCase(),
      emailAddress: data.email,
      hashedPassword: hashedPassword,
      emailConfirmationLink: `https://mathematicalbasedefenders.com/confirm-email-address?email=${encodedEmail}&code=${emailConfirmationCode}`,
      emailConfirmationCode: hashedEmailConfirmationCode,
      expiresAt: new Date(Date.now() + 1800000).getTime()
    };

    await PendingUser.create(dataToSave);

    log.info(`Created new pending user with username ${data.username}.`);
    return {
      success: true,
      statusCode: 200,
      data: data
    };
  }

  async validateUserData(data: PendingUserData) {
    try {
      if (!data.email) {
        log.warn(`Refused to create pending user due to empty email.`);
        return {
          success: false,
          statusCode: 400,
          error: "Empty e-mail field."
        };
      }

      if (!data.username) {
        log.warn(`Refused to create pending user due to empty username.`);
        return {
          success: false,
          statusCode: 400,
          error: "Empty username field."
        };
      }

      if (ExpressMongoSanitize.has([data.email], true)) {
        log.warn(
          `Refused to create pending user due to potentially insecure email.`
        );
        return {
          success: false,
          statusCode: 400,
          error:
            "Invalid e-mail format. (E-mail contains special characters that may not work with implementation.)"
        };
      }

      if (!this.validatePendingEmail(data)) {
        log.warn(`Refused to create pending user due to invalid email.`);
        return {
          success: false,
          statusCode: 400,
          error: "Invalid e-mail format."
        };
      }

      if (!this.validatePendingUsername(data)) {
        log.warn(
          `Refused to create pending user due to invalid username: ${data.username}.`
        );
        return {
          success: false,
          statusCode: 400,
          error: "Invalid username format."
        };
      }

      if (!this.validatePendingPassword(data)) {
        log.warn(`Refused to create pending user due to invalid password.`);
        return {
          success: false,
          statusCode: 400,
          error: "Invalid password format."
        };
      }

      const isUniqueEmail = await this.checkForDuplicateEmail(data);
      if (!isUniqueEmail) {
        log.warn(`Refused to create pending user due to duplicate email.`);
        return {
          success: false,
          statusCode: 400,
          error: "E-mail already exists."
        };
      }

      const isUniqueUsername = await this.checkForDuplicateUsername(data);
      if (!isUniqueUsername) {
        log.warn(
          `Refused to create pending user due to duplicate username: ${data.username}`
        );
        return {
          success: false,
          statusCode: 400,
          error: "Username already exists."
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

  validatePendingEmail(data: PendingUserData) {
    const email = data.email;
    return EMAIL_REGEX.test(email);
  }

  validatePendingUsername(data: PendingUserData) {
    const username = data.username;
    return USERNAME_REGEX.test(username);
  }

  validatePendingPassword(data: PendingUserData) {
    const password = data.password;
    return PASSWORD_REGEX.test(password);
  }

  async checkForDuplicateEmail(data: PendingUserData) {
    const userRepository = new UserRepository();
    const existing = await userRepository.getUserDataByEmail(data.email);
    const pendingExisting = await this.checkPendingUserExistenceByEmail(
      data.email
    );
    return !existing && !pendingExisting;
  }

  async checkForDuplicateUsername(data: PendingUserData) {
    const userRepository = new UserRepository();
    const existing = await userRepository.getUserDataByUsername(data.username);
    const pendingExisting = await this.checkPendingUserExistenceByUsername(
      data.username
    );
    return !existing && !pendingExisting;
  }

  createEmailConfirmationCode() {
    const result = crypto.randomUUID();
    return result;
  }

  async hashPassword(data: PendingUserData) {
    const plaintextPassword = data.password;
    const salt = await bcrypt.genSalt(13);
    const hashedPassword = await bcrypt.hash(plaintextPassword, salt);
    return hashedPassword;
  }

  async sendMailToUser(data: PendingUserData, confirmationCode: string) {
    if (process.env.CREDENTIAL_SET_USED !== "production") {
      log.warn(`Using testing credentials when sending mail.`);
      log.warn(`Mail to pending user ${data.username} not sent.`);
      log.debug(`Confirmation code for ${data.username}: ${confirmationCode}`);
      return true;
    }
    const result = sendMailToNewlyRegisteredUser(data.email, confirmationCode);
    return result;
  }

  async verifyPendingUser(email: string, confirmationCode: string) {
    if (typeof email !== "string") {
      log.warn(`Request to verify user failed: Invalid e-mail type.`);
      return {
        success: false,
        error: "Invalid credentials.",
        statusCode: 400
      };
    }

    if (typeof confirmationCode !== "string") {
      log.warn(`Request to verify user failed: Invalid code type.`);
      return {
        success: false,
        error: "Invalid credentials.",
        statusCode: 400
      };
    }

    const decodedEmail = decodeURIComponent(email).toLowerCase();
    const decodedCode = decodeURIComponent(confirmationCode);

    const user = await this.getPendingUserDataByCredentials(
      decodedEmail,
      decodedCode
    );
    if (!user) {
      log.warn(`Refused to verify user due to non-existent pending user.`);
      return {
        success: false,
        statusCode: 400,
        error: "User to verify's record not found or invalid."
      };
    }

    try {
      const userRepository = new UserRepository();
      const metadataRepository = new MetadataRepository();

      await this.deletePendingUser(decodedEmail, decodedCode);
      await userRepository.createUser(user);
      await metadataRepository.incrementUserCount();
    } catch (error) {
      log.error(`Error while validating user: ${error}`);
      return {
        statusCode: 500,
        success: false,
        error: "Internal Server Error."
      };
    }

    log.info(`Verified new user: ${user.username}`);
    return {
      success: true,
      statusCode: 200
    };
  }

  private async checkPendingUserExistenceByUsername(username: string) {
    const existing = await PendingUser.findOne({ username: username }).count();
    return existing > 0;
  }

  private async checkPendingUserExistenceByEmail(email: string) {
    const existing = await PendingUser.findOne({ emailAddress: email }).count();
    return existing > 0;
  }

  private async getPendingUserDataByCredentials(
    email: string,
    confirmationCode: string
  ) {
    const hashedEmailConfirmationCode = sha256(confirmationCode);
    const pendingUser = await PendingUser.findOne({
      $and: [
        { emailAddress: email },
        { emailConfirmationCode: hashedEmailConfirmationCode }
      ]
    })
      .clone()
      .lean();
    return pendingUser;
  }

  /**
   * Use when e.g. a pending user is verified.
   */
  private async deletePendingUser(email: string, confirmationCode: string) {
    const hashedEmailConfirmationCode = sha256(confirmationCode);
    await PendingUser.findOneAndDelete({
      $and: [
        { emailAddress: email },
        { emailConfirmationCode: hashedEmailConfirmationCode }
      ]
    });

    const emailPrefix = email.substring(0, 5);
    log.info(
      `Deleted pending user record with email starting with ${emailPrefix}.`
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

export { PendingUserRepository };
