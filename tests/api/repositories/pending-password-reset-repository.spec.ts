import * as chai from "chai";
const should = chai.should();

import PendingPasswordResetRepository from "../../../src/api/repositories/PendingPasswordResetRepository";
import { getMockUserEmail } from "../../mock-data-generator";
import { PendingPasswordReset } from "../../../src/api/models/PendingPasswordReset";

describe("PendingPasswordResetRepository", function () {
  describe(".createPendingPasswordResetRecord()", function () {
    it("should return status code 200 and create record in database if existing email is given", async function () {
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
      statusCode.should.equal(200);
      const record = await PendingPasswordReset.findOne({
        emailAddress: data.email
      });
      should.exist(record);
    });

    it("should return status code 200 but not create record in database if non-existent email is given", async function () {
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
      statusCode.should.equal(200);
      const record = await PendingPasswordReset.findOne({
        emailAddress: data.email
      });
      should.not.exist(record);
    });
  });

  it("should return status code 200 but only have exactly 1 record in database to the same email if duplicate email is given", async function () {
    const data = {
      email: getMockUserEmail(1)
    };
    const pendingPasswordResetRepository = new PendingPasswordResetRepository();

    await pendingPasswordResetRepository.createPendingPasswordResetRecord(data);

    const result =
      await pendingPasswordResetRepository.createPendingPasswordResetRecord(
        data
      );
    const statusCode = result.statusCode;
    statusCode.should.equal(200);
    const record = await PendingPasswordReset.find({
      emailAddress: data.email
    });
    record.should.have.length(1);
  });

  it("should return status code 400 if invalid email is given (doesn't match regex)", async function () {
    const data = {
      email: "??????"
    };
    const pendingPasswordResetRepository = new PendingPasswordResetRepository();

    await pendingPasswordResetRepository.createPendingPasswordResetRecord(data);

    const result =
      await pendingPasswordResetRepository.createPendingPasswordResetRecord(
        data
      );
    const statusCode = result.statusCode;
    statusCode.should.equal(400);
  });

  describe(".verifyPendingPasswordReset()", function () {
    it("should return status code 200 if invalid email is given", async function () {
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
          data.email,
          confirmationCode,
          newPassword,
          newPassword
        );
      const statusCode = result.statusCode;
      statusCode.should.equal(200);
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
          getMockUserEmail(2),
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
          data.email,
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
          data.email,
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
          data.email,
          confirmationCode,
          "abc345",
          "abc345"
        );
      const statusCode = result.statusCode;
      statusCode.should.equal(400);
    });
  });
});
