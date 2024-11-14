// App must be running before running this test

// This test assumes
// - account w/ username test is registered with e-mail test@example.com exists
// - account w/ username testprime is NOT registered and account w/ e-mail testprime@example.com does NOT exist.

import { validateNewUser } from "../../src/server/services/user";

const EXAMPLE_USER = {
  username: "test",
  email: "test@example.com",
  plaintextPassword: "test12345test"
};

const TEST_USER = {
  username: "testprime",
  email: "testprime@example.com",
  plaintextPassword: "test12345test"
};

const INVALID_USER = {
  username: "*()#($)*&(#@*($",
  email: "aaaaaaaaaaaa",
  plaintextPassword: "hello"
};

describe("checking new user registration details ", function () {
  it("should return true if everything is ok", async function () {
    const result = await validateNewUser(
      TEST_USER.username,
      TEST_USER.email,
      TEST_USER.plaintextPassword
    );
    result.should.include({ success: true });
  });

  it("should return false with correct reason if username is already taken", async function () {
    const result = await validateNewUser(
      EXAMPLE_USER.username,
      TEST_USER.email,
      TEST_USER.plaintextPassword
    );
    result.should.include({ success: false });
    result.should.include({
      redirectTo: "?errorID=usernameUnavailable"
    });
  });

  it("should return false with correct reason if username is invalid", async function () {
    const result = await validateNewUser(
      INVALID_USER.username,
      TEST_USER.email,
      TEST_USER.plaintextPassword
    );
    result.should.include({ success: false });
    result.should.include({
      redirectTo: "?errorID=usernameInvalid"
    });
  });

  it("should return false with correct reason if e-mail is already taken", async function () {
    const result = await validateNewUser(
      TEST_USER.username,
      EXAMPLE_USER.email,
      TEST_USER.plaintextPassword
    );
    result.should.include({ success: false });
    result.should.include({
      redirectTo: "?errorID=emailUnavailable"
    });
  });

  it("should return false with correct reason if e-mail is invalid", async function () {
    const result = await validateNewUser(
      TEST_USER.username,
      INVALID_USER.email,
      TEST_USER.plaintextPassword
    );
    result.should.include({ success: false });
    result.should.include({
      redirectTo: "?errorID=emailInvalid"
    });
  });

  it("should return false with correct reason if password is invalid", async function () {
    const result = await validateNewUser(
      TEST_USER.username,
      TEST_USER.email,
      INVALID_USER.plaintextPassword
    );
    result.should.include({ success: false });
    result.should.include({
      redirectTo: "?errorID=passwordInvalid"
    });
  });

  it("should return false with correct reason if username is empty", async function () {
    const result = await validateNewUser(
      "",
      TEST_USER.email,
      TEST_USER.plaintextPassword
    );
    result.should.include({ success: false });
    result.should.include({
      redirectTo: "?errorID=usernameInvalid"
    });
  });

  it("should return false with correct reason if e-mail is empty", async function () {
    const result = await validateNewUser(
      TEST_USER.username,
      "",
      TEST_USER.plaintextPassword
    );
    result.should.include({ success: false });
    result.should.include({
      redirectTo: "?errorID=emailInvalid"
    });
  });

  it("should return false with correct reason if password is empty", async function () {
    const result = await validateNewUser(
      TEST_USER.username,
      TEST_USER.email,
      ""
    );
    result.should.include({ success: false });
    result.should.include({
      redirectTo: "?errorID=passwordInvalid"
    });
  });
});
