import * as chai from "chai";
const should = chai.should();

import PendingPasswordResetRepository from "../../../src/api/repositories/PendingPasswordResetRepository";
import { getMockUserEmail } from "../../mock-data-generator";
import { PendingPasswordReset } from "../../../src/api/models/PendingPasswordReset";
import { User } from "../../../src/api/models/User";
import { sha256 } from "js-sha256";
import bcrypt from "bcrypt";

describe("PendingPasswordResetRepository", function () {
  describe(".createPendingPasswordResetRecord()", function () {
    it("should return status code 400 if email is empty", async function () {
      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();
      const result =
        await pendingPasswordResetRepository.createPendingPasswordResetRecord({
          email: ""
        });

      result.success.should.equal(false);
      result.statusCode.should.equal(400);
      result.error?.should.equal("Empty e-mail field.");
    });

    it("should return status code 201 and create record in database if existing email is given", async function () {
      const data = {
        email: getMockUserEmail(1)
      };
      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();
      const result =
        await pendingPasswordResetRepository.createPendingPasswordResetRecord(
          data
        );
      const statusCode = result.statusCode;
      statusCode.should.equal(201);
      const record = await PendingPasswordReset.findOne({
        emailAddress: data.email
      });
      should.exist(record);
    });

    it("should normalize an existing user's email to lowercase", async function () {
      const data = {
        email: getMockUserEmail(1).toUpperCase()
      };
      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();
      const result =
        await pendingPasswordResetRepository.createPendingPasswordResetRecord(
          data
        );

      result.statusCode.should.equal(201);
      const record = await PendingPasswordReset.findOne({
        emailAddress: getMockUserEmail(1)
      });
      should.exist(record);
    });

    it("should return status code 201 but not create record in database if non-existent email is given", async function () {
      const data = {
        email: "thisEmailDoesNotExist@example.com"
      };
      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();
      const result =
        await pendingPasswordResetRepository.createPendingPasswordResetRecord(
          data
        );
      const statusCode = result.statusCode;
      statusCode.should.equal(201);
      const record = await PendingPasswordReset.findOne({
        emailAddress: data.email
      });
      should.not.exist(record);
    });

    it("should return status code 201 but only have exactly 1 record in database to the same email if duplicate email is given", async function () {
      const data = {
        email: getMockUserEmail(1)
      };
      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();

      await pendingPasswordResetRepository.createPendingPasswordResetRecord(
        data
      );

      const result =
        await pendingPasswordResetRepository.createPendingPasswordResetRecord(
          data
        );
      const statusCode = result.statusCode;
      statusCode.should.equal(201);
      const record = await PendingPasswordReset.find({
        emailAddress: data.email
      });
      record.should.have.length(1);
    });

    it("should return status code 400 if invalid email is given (doesn't match regex)", async function () {
      const data = {
        email: "??????"
      };
      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();

      await pendingPasswordResetRepository.createPendingPasswordResetRecord(
        data
      );

      const result =
        await pendingPasswordResetRepository.createPendingPasswordResetRecord(
          data
        );
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });
  });

  describe(".checkPasswordResetRecordExistence()", function () {
    it("should return the user ID for valid credentials", async function () {
      const email = getMockUserEmail(1);
      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();
      await pendingPasswordResetRepository.createPendingPasswordResetRecord({
        email
      });
      const record = await PendingPasswordReset.findOne({
        emailAddress: email
      });
      should.exist(record);

      const code =
        record?.passwordResetConfirmationLink.split("&code=")[1] ?? "";
      const result =
        await pendingPasswordResetRepository.checkPasswordResetRecordExistence(
          sha256(email),
          code
        );

      result.success.should.equal(true);
      result.statusCode.should.equal(200);
      (result.data as { userID: string }).userID
        .toString()
        .should.equal(record?.userID.toString());
    });

    it("should return status code 404 for invalid credentials", async function () {
      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();
      const result =
        await pendingPasswordResetRepository.checkPasswordResetRecordExistence(
          sha256(getMockUserEmail(1)),
          "invalid-code"
        );

      result.success.should.equal(false);
      result.statusCode.should.equal(404);
    });
  });

  describe(".verifyPendingPasswordReset()", function () {
    it("should return status code 200 if correct credentials are given", async function () {
      const data = {
        email: getMockUserEmail(1)
      };

      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();
      await pendingPasswordResetRepository.createPendingPasswordResetRecord(
        data
      );

      const record = await PendingPasswordReset.findOne({
        emailAddress: data.email
      });
      const newPassword = "newPassword";

      if (!record) {
        should.fail("Record not created and unable to progress further.");
        return;
      }

      const index = record.passwordResetConfirmationLink.indexOf("&code=");
      const confirmationCode = record.passwordResetConfirmationLink.substring(
        index + 6
      );

      const result =
        await pendingPasswordResetRepository.verifyPendingPasswordReset(
          record.userID,
          sha256(data.email),
          confirmationCode,
          newPassword,
          newPassword
        );
      const statusCode = result.statusCode;
      statusCode.should.equal(200);

      const updatedUser = await User.findById(record.userID).select({
        hashedPassword: 1
      });
      const deletedRecord = await PendingPasswordReset.findById(record._id);
      should.exist(updatedUser);
      (
        await bcrypt.compare(
          newPassword,
          updatedUser?.hashedPassword ?? ""
        )
      ).should.equal(true);
      should.not.exist(deletedRecord);
    });

    it("should return status code 400 if the user ID is invalid", async function () {
      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();
      const result =
        await pendingPasswordResetRepository.verifyPendingPasswordReset(
          "invalid-user-id",
          sha256(getMockUserEmail(1)),
          "unused-code",
          "newPassword",
          "newPassword"
        );

      result.success.should.equal(false);
      result.statusCode.should.equal(400);
      result.error?.should.equal("Invalid credentials.");
    });

    it("should return status code 400 if the user ID does not match the reset record", async function () {
      const email = getMockUserEmail(1);
      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();
      await pendingPasswordResetRepository.createPendingPasswordResetRecord({
        email
      });
      const record = await PendingPasswordReset.findOne({
        emailAddress: email
      });
      const otherUser = await User.findOne({
        emailAddress: getMockUserEmail(2)
      });
      should.exist(record);
      should.exist(otherUser);

      const code =
        record?.passwordResetConfirmationLink.split("&code=")[1] ?? "";
      const result =
        await pendingPasswordResetRepository.verifyPendingPasswordReset(
          otherUser?._id.toString() ?? "",
          sha256(email),
          code,
          "newPassword",
          "newPassword"
        );

      result.success.should.equal(false);
      result.statusCode.should.equal(400);
      const unchangedRecord = await PendingPasswordReset.findById(record?._id);
      should.exist(unchangedRecord);
    });

    it("should return status code 400 if credentials don't match (email)", async function () {
      const data = {
        email: getMockUserEmail(1)
      };

      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();
      await pendingPasswordResetRepository.createPendingPasswordResetRecord(
        data
      );

      const record = await PendingPasswordReset.findOne({
        emailAddress: data.email
      });
      const newPassword = "newPassword";

      if (!record) {
        should.fail("Record not created and unable to progress further.");
        return;
      }

      const index = record.passwordResetConfirmationLink.indexOf("&code=");
      const confirmationCode = record.passwordResetConfirmationLink.substring(
        index + 6
      );

      const result =
        await pendingPasswordResetRepository.verifyPendingPasswordReset(
          record.userID,
          sha256(getMockUserEmail(2)),
          confirmationCode,
          newPassword,
          newPassword
        );
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 400 if credentials don't match (confirmation code)", async function () {
      const data = {
        email: getMockUserEmail(1)
      };

      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();
      await pendingPasswordResetRepository.createPendingPasswordResetRecord(
        data
      );

      const record = await PendingPasswordReset.findOne({
        emailAddress: data.email
      });
      const newPassword = "newPassword";

      if (!record) {
        should.fail("Record not created and unable to progress further.");
        return;
      }

      const result =
        await pendingPasswordResetRepository.verifyPendingPasswordReset(
          record.userID,
          sha256(data.email),
          "does-not-match",
          newPassword,
          newPassword
        );
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 400 if new password and confirm new password don't match", async function () {
      const data = {
        email: getMockUserEmail(1)
      };

      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();
      await pendingPasswordResetRepository.createPendingPasswordResetRecord(
        data
      );

      const record = await PendingPasswordReset.findOne({
        emailAddress: data.email
      });
      const newPassword = "newPassword";

      if (!record) {
        should.fail("Record not created and unable to progress further.");
        return;
      }

      const index = record.passwordResetConfirmationLink.indexOf("&code=");
      const confirmationCode = record.passwordResetConfirmationLink.substring(
        index + 6
      );

      const result =
        await pendingPasswordResetRepository.verifyPendingPasswordReset(
          record.userID,
          sha256(data.email),
          confirmationCode,
          newPassword,
          "abcd12345"
        );
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });

    it("should return status code 400 if new password doesn't follow format (doesn't match regex)", async function () {
      const data = {
        email: getMockUserEmail(1)
      };

      const pendingPasswordResetRepository =
        new PendingPasswordResetRepository();
      await pendingPasswordResetRepository.createPendingPasswordResetRecord(
        data
      );

      const record = await PendingPasswordReset.findOne({
        emailAddress: data.email
      });
      const newPassword = "newPassword";

      if (!record) {
        should.fail("Record not created and unable to progress further.");
        return;
      }

      const index = record.passwordResetConfirmationLink.indexOf("&code=");
      const confirmationCode = record.passwordResetConfirmationLink.substring(
        index + 6
      );

      const result =
        await pendingPasswordResetRepository.verifyPendingPasswordReset(
          record.userID,
          sha256(data.email),
          confirmationCode,
          "abc345",
          "abc345"
        );
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });
  });
});
