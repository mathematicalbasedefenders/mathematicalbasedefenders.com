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

  it("should return status code 400 if invalid email is given", async function () {
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
});
