const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

import { log } from "../core/log";
// var PendingUser = require("../models/PendingUser.js");
// var User = require("../models/User.js");
import { PendingUser } from "../models/PendingUser";
import { User } from "../models/User";
import { MembershipInterface } from "../typings/MembershipInterface";

async function validateNewUser(
  desiredUsername: string,
  desiredEmail: string,
  plaintextPassword: string
) {
  if (!checkUsernameValidity(desiredUsername)) {
    // registration failed - username not valid
    return {
      success: false,
      redirectTo: "?errorID=usernameInvalid"
    };
  }

  const usernameOK = await checkUsernameAvailability(desiredUsername);
  if (!usernameOK) {
    // registration failed - username already taken
    return {
      success: false,
      redirectTo: "?errorID=usernameUnavailable"
    };
  }

  if (!checkEmailValidity(desiredEmail)) {
    // registration failed - email not valid
    return {
      success: false,
      redirectTo: "?errorID=emailInvalid"
    };
  }

  const emailOK = await checkEmailAvailability(desiredEmail);
  if (!emailOK) {
    // registration failed - email already taken
    return {
      success: false,
      redirectTo: "?errorID=emailUnavailable"
    };
  }

  if (!checkPasswordValidity(plaintextPassword)) {
    return {
      success: false,
      redirectTo: "?errorID=passwordInvalid"
    };
  }

  return {
    success: true
  };
}

async function addUnverifiedUser(
  desiredUsername: string,
  desiredEmail: string,
  plaintextPassword: string
) {
  const emailConfirmationCode = uuidv4();
  let salt, hashedPassword;
  try {
    salt = await bcrypt.genSalt(14);
  } catch (error: any) {
    log.error(error.stack);
    return {
      success: false,
      redirectTo: "?errorID=internalError"
    };
  }

  try {
    hashedPassword = await bcrypt.hash(plaintextPassword, salt);
  } catch (error: any) {
    log.error(error.stack);
    return {
      success: false,
      redirectTo: "?errorID=internalError"
    };
  }

  const dataToSave = {
    username: desiredUsername,
    usernameInAllLowercase: desiredUsername.toLowerCase(),
    emailAddress: desiredEmail,
    hashedPassword: hashedPassword,
    emailConfirmationLink: `https://mathematicalbasedefenders.com/confirm-email-address?email=${desiredEmail}&code=${emailConfirmationCode}`,
    emailConfirmationCode: emailConfirmationCode,
    expiresAt: new Date(Date.now() + 1800000).getTime()
  };

  const pendingUserModelToSave = new PendingUser(dataToSave);

  try {
    pendingUserModelToSave.save();
  } catch (error: any) {
    log.error(error.stack);
    return {
      success: false,
      redirectTo: "?errorID=internalError"
    };
  }

  return {
    success: true,
    emailConfirmationCode: emailConfirmationCode
  };
}

async function checkUsernameAvailability(desiredUsername: string) {
  const usernameCase1 = await User.findOne({
    username: desiredUsername
  }).clone();

  const usernameCase2 = await User.findOne({
    usernameInAllLowercase: desiredUsername.toLowerCase()
  }).clone();

  return !(usernameCase1 || usernameCase2);
}

function checkUsernameValidity(desiredUsername: string) {
  const doesNotMatchPattern = !/^[0-9a-zA-Z_]+$/.test(desiredUsername);
  const tooLong = desiredUsername.length > 20;
  const tooShort = desiredUsername.length < 3;
  const isEmptyString = desiredUsername == "";
  const isNull = desiredUsername == null;
  return !(
    doesNotMatchPattern ||
    tooLong ||
    tooShort ||
    isEmptyString ||
    isNull
  );
}

async function checkEmailAvailability(desiredEmail: string) {
  const emailCase1 = await User.findOne({
    emailAddress: desiredEmail
  }).clone();

  const emailCase2 = await PendingUser.findOne({
    emailAddress: desiredEmail
  }).clone();
  return !(emailCase1 || emailCase2);
}

function checkEmailValidity(desiredEmail: string) {
  const doesNotMatchPattern =
    !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(
      desiredEmail
    );
  const isEmptyString = desiredEmail == "";
  const isNull = desiredEmail == null;
  return !(doesNotMatchPattern || isEmptyString || isNull);
}

function checkPasswordValidity(plaintextPassword: string) {
  const tooShort = plaintextPassword.length < 8;
  const tooLong = plaintextPassword.length > 48;
  const isEmptyString = plaintextPassword === "";
  const isNull = plaintextPassword === null;
  const hasSpaces = plaintextPassword.includes(" ");
  const doesNotMatchPattern =
    !/^[0-9a-zA-Z!"#$%&'()*+,-.:;<=>?@^_`{|}~]*$/.test(plaintextPassword);
  return !(
    tooShort ||
    tooLong ||
    isEmptyString ||
    isNull ||
    hasSpaces ||
    doesNotMatchPattern
  );
}

function getUserRank(membership: MembershipInterface) {
  if (membership?.isDeveloper) {
    return { title: "Developer", color: "#ff0000" };
  }
  if (membership?.isAdministrator) {
    return { title: "Administrator", color: "#ff0000" };
  }
  if (membership?.isModerator) {
    return { title: "Moderator", color: "#ff7f00" };
  }
  if (membership?.isContributor) {
    return { title: "Contributor", color: "#01acff" };
  }
  if (membership?.isTester) {
    return { title: "Tester", color: "#5bb1e0" };
  }
  if (membership?.isDonator) {
    return { title: "Donator", color: "#26e02c" };
  }
  // No rank
  return { title: "(No Rank)", color: "" };
}

export { addUnverifiedUser, validateNewUser, getUserRank };
