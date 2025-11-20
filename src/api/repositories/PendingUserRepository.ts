import { sha256 } from "js-sha256";
import log from "../core/log";
import { PendingUser } from "../models/PendingUser";
import RepositoryResponse from "../types/RepositoryResponse";
import bcrypt from "bcrypt";
import crypto from "crypto";

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
const USERNAME_REGEX = /^[A-Za-z0-9_\-]{3,20}$/;
const PASSWORD_REGEX = /^[0-9a-zA-Z!"#$%&'()*+,-.:;<=>?@^_`{|}~]{8,48}$/;

type PendingUserData = {
  email: string;
  username: string;
  password: string;
};

export default class PendingUserRepository {
  async createPendingUser(data: PendingUserData): Promise<RepositoryResponse> {
    if (!this.validatePendingEmail(data)) {
      log.warn(`Refused to create pending user due to invalid email.`);
      return {
        success: false,
        status: 400,
        error: "Invalid e-mail format."
      };
    }

    if (!this.validatePendingUsername(data)) {
      log.warn(
        `Refused to create pending user due to invalid username: ${data.username}.`
      );
      return {
        success: false,
        status: 400,
        error: "Invalid username format."
      };
    }

    if (!this.validatePendingPassword(data)) {
      log.warn(`Refused to create pending user due to invalid password.`);
      return {
        success: false,
        status: 400,
        error: "Invalid password format."
      };
    }

    const hashedPassword = this.hashPassword(data);
    const emailConfirmationCode = this.createEmailConfirmationCode();
    const hashedEmailConfirmationCode = sha256(emailConfirmationCode);

    const dataToSave = {
      username: data.username,
      usernameInAllLowercase: data.username.toLowerCase(),
      emailAddress: data.email,
      hashedPassword: hashedPassword,
      emailConfirmationLink: `https://mathematicalbasedefenders.com/confirm-email-address?email=${data.email}&code=${emailConfirmationCode}`,
      emailConfirmationCode: hashedEmailConfirmationCode,
      expiresAt: new Date(Date.now() + 1800000).getTime()
    };
    PendingUser.create(dataToSave);
    log.info(`Created new pending user with username ${data.username}.`);
    return {
      success: true,
      status: 200,
      data: data
    };
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

  createEmailConfirmationCode() {
    const result = crypto.randomBytes(32).toString();
    return result;
  }

  async hashPassword(data: PendingUserData) {
    const plaintextPassword = data.password;
    const salt = await bcrypt.genSalt(13);
    const hashedPassword = await bcrypt.hash(plaintextPassword, salt);
    return hashedPassword;
  }
}

export { PendingUserRepository };
