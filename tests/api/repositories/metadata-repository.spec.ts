import * as chai from "chai";
const should = chai.should();

import mongoose from "mongoose";
import Metadata from "../../../src/api/models/Metadata";
import MetadataRepository from "../../../src/api/repositories/MetadataRepository";

function createMetadata(usersRegistered: number, documentIsMetadata = true) {
  return Metadata.create({
    _id: new mongoose.Types.ObjectId(),
    usersRegistered,
    documentIsMetadata
  });
}

describe("MetadataRepository", function () {
  describe(".getMetadata()", function () {
    it("should return status code 404 if metadata does not exist", async function () {
      const metadataRepository = new MetadataRepository();
      const result = await metadataRepository.getMetadata();

      result.success.should.equal(false);
      result.statusCode.should.equal(404);
      result.error?.should.equal("Metadata not found.");
    });

    it("should ignore documents that are not marked as metadata", async function () {
      await createMetadata(99, false);

      const metadataRepository = new MetadataRepository();
      const result = await metadataRepository.getMetadata();

      result.success.should.equal(false);
      result.statusCode.should.equal(404);
    });

    it("should return only the public metadata fields", async function () {
      await createMetadata(5);

      const metadataRepository = new MetadataRepository();
      const result = await metadataRepository.getMetadata();
      const data = result.data as { usersRegistered: number; _id?: unknown };

      result.success.should.equal(true);
      result.statusCode.should.equal(200);
      data.usersRegistered.should.equal(5);
      Object.prototype.hasOwnProperty.call(data, "_id").should.equal(false);
    });
  });

  describe(".incrementUserCount()", function () {
    it("should increment the registered user count", async function () {
      await createMetadata(5);

      const metadataRepository = new MetadataRepository();
      await metadataRepository.incrementUserCount();

      const metadata = await Metadata.findOne({ documentIsMetadata: true });
      should.exist(metadata);
      metadata?.usersRegistered.should.equal(6);
    });

    it("should apply concurrent increments atomically", async function () {
      await createMetadata(5);

      const metadataRepository = new MetadataRepository();
      await Promise.all(
        Array.from({ length: 10 }, () =>
          metadataRepository.incrementUserCount()
        )
      );

      const metadata = await Metadata.findOne({ documentIsMetadata: true });
      should.exist(metadata);
      metadata?.usersRegistered.should.equal(15);
    });

    it("should not create metadata if the metadata document is absent", async function () {
      const metadataRepository = new MetadataRepository();
      await metadataRepository.incrementUserCount();

      const metadataCount = await Metadata.countDocuments();
      metadataCount.should.equal(0);
    });
  });
});
