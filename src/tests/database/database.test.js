const {MongoClient} = require('mongodb');
const mongoose = require("mongoose");

const UserService = require("../../server/services/user.js");

const PendingUser = require("../../server/models/PendingUser.js");
const User = require("../../server/models/User.js");

// TODO: Yeah, I know that mongoosejs docs dont recommend jest for testing, but ima fix it later

describe("database: ", () => {
  let connection;
  let database;

  let exampleValidUser = {
    desiredUsername: "MISTERTFY64888",
    desiredEmail: "esfeifhweifh@example.com",
    plaintextPassword: "694201337lol"
  }

  let exampleInvalidUser = {
    desiredUsername: "MISter-TFY-64",
    desiredEmail: "esfeifhweifh@example.com",
    plaintextPassword: "694201337lol"
  }

  beforeAll(async () => {
    connection = await mongoose.connect(`mongodb://localhost:27017`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await User.createCollection();
  });

  afterAll(async () => {
    await PendingUser.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  test("example valid user should pass validation checks", async ()=>{
    let result = await UserService.validateNewUserInformation(exampleValidUser.desiredUsername, exampleValidUser.desiredEmail, exampleValidUser.plaintextPassword);
    expect(result.success).toBe(true);
  });

  test("example valid user that passed validation checks should be written to database", async ()=>{
    let result = await UserService.addUnverifiedUser(exampleValidUser.desiredUsername, exampleValidUser.desiredEmail, exampleValidUser.plaintextPassword);
    expect(result.success).toBe(true);
  });


  test("example invalid user should fail validation checks", async ()=>{
    let result = await UserService.validateNewUserInformation(exampleInvalidUser.desiredUsername, exampleInvalidUser.desiredEmail, exampleInvalidUser.plaintextPassword);
    expect(result.success).toBe(false);
  });
});