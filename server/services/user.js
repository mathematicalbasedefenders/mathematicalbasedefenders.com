const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

var PendingUser = require("../models/PendingUser.js");
var User = require("../models/User.js");


async function validateNewUserInformation(
  desiredUsername,
  desiredEmail,
  plaintextPassword
) {
  let desiredUsernameInAllLowercase = desiredUsername.toLowerCase();


  // get information
  let emailIsNotAvailable1 = await User.findOne({
    emailAddress: desiredEmail
  })
    .clone()
    .select(desiredEmail);



    let usernameIsNotAvailable1 = await User.findOne({
    usernameInAllLowercase: desiredUsernameInAllLowercase
  })
    .clone()
    .select(desiredUsernameInAllLowercase);



    let emailIsNotAvailable2 = await PendingUser.findOne({
    emailAddress: desiredEmail
  })
    .clone()
    .select(desiredEmail);
  let usernameIsNotAvailable2 = await PendingUser.findOne({
    usernameInAllLowercase: desiredUsernameInAllLowercase
  })
    .clone()
    .select(desiredUsernameInAllLowercase);

  if (usernameIsNotAvailable1 || usernameIsNotAvailable2) {
    // registration failed - username already taken
    return {
      success: false,
      redirectTo: "?erroroccurred=true&errorreason=usernamealreadytaken"
    };
  }

  if (
    !/^[0-9a-zA-Z_]+$/.test(desiredUsername) ||
    desiredUsername.length > 20 ||
    desiredUsername.length < 3 ||
    desiredUsername == "" ||
    desiredUsername == null
  ) {
    // registration failed - username not valid
    return {
      success: false,
      redirectTo: "?erroroccurred=true&errorreason=usernamenotvalid"
    };
  }

  if (emailIsNotAvailable1 || emailIsNotAvailable2) {
    // registration failed - email already taken
    return {
      success: false,
      redirectTo: "?erroroccurred=true&errorreason=emailalreadytaken"
    };
  }

  if (
    !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(
      desiredEmail
    ) ||
    desiredEmail == "" ||
    desiredEmail == null
  ) {
    // registration failed - email not valid
    return {
      success: false,
      redirectTo: "?erroroccurred=true&errorreason=emailnotvalid"
    };
  }

  if (
    plaintextPassword.length < 8 ||
    plaintextPassword.length > 64 ||
    plaintextPassword === "" ||
    plaintextPassword === null ||
    plaintextPassword.includes(" ") ||
    !/^[0-9a-zA-Z!"#$%&'()*+,-.:;<=>?@^_`{|}~]*$/.test(plaintextPassword)
  ) {
    return {
      success: false,
      redirectTo: "?erroroccurred=true&errorreason=passwordnotvalid"
    };
  }

  return {
    success: true,
  }
}

async function addUnverifiedUser(desiredUsername, desiredEmail, plaintextPassword) {

  let emailConfirmationCode = uuidv4();
  let salt, hashedPassword;
  try {
    salt = await bcrypt.genSalt(16);
  } catch (error) {
    return {
      success: false,
      redirectTo: "?erroroccurred=true&errorreason=internalerror"
    }
  }
  
  try {
    hashedPassword = await bcrypt.hash(plaintextPassword, salt);
  } catch (error) {
    return {
      success: false,
      redirectTo: "?erroroccurred=true&errorreason=internalerror"
    }
  }

  let dataToSave = {
    username: desiredUsername,
    usernameInAllLowercase: desiredUsername.toLowerCase(),
    emailAddress: desiredEmail,
    hashedPassword: hashedPassword,
    emailConfirmationLink: `https://mathematicalbasedefenders.com/confirm-email-address?email=${desiredEmail}&code=${emailConfirmationCode}`,
    emailConfirmationCode: emailConfirmationCode,
    expiresAt: new Date(Date.now() + 1800000).getTime()
  };

  let pendingUserModelToSave = new PendingUser(dataToSave);

  try {
    pendingUserModelToSave.save()
  } catch (error) {
    return {
      success: false,
      redirectTo: "?erroroccurred=true&errorreason=internalerror"
    }
  }

  return {
    success: true,
    emailConfirmationCode: emailConfirmationCode
  }

}


module.exports = {
  addUnverifiedUser,
  validateNewUserInformation
};
