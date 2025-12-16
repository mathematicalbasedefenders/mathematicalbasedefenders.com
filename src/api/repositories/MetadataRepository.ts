import log from "../core/log";
import Metadata from "../models/Metadata";
import RepositoryResponse from "../types/RepositoryResponse";

export default class MetadataRepository {
  async getMetadata(): Promise<RepositoryResponse> {
    const data = await Metadata.findOne({}).select({
      usersRegistered: 1,
      _id: 0
    });
    if (!data) {
      log.warn(`Can't find Metadata from MetadataRepository`);
      return {
        success: false,
        statusCode: 404,
        error: "Metadata not found."
      };
    }

    log.info(`Returning data from MetadataRepository.`);
    return {
      success: true,
      statusCode: 200,
      data: data
    };
  }

  async incrementUserCount() {
    const data = await Metadata.findOne(
      { "documentIsMetadata": true },
      { $inc: { "usersRegistered": 1 } },
      { new: true }
    );
    if (!data) {
      log.warn(`Can't find Metadata from MetadataRepository`);
      log.warn(`Did not increment user count.`);
      return;
    }
  }
}
