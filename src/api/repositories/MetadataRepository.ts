import log from "../core/log";
import Metadata from "../models/Metadata";
import RepositoryResponse from "../types/RepositoryResponse";

export default class MetadataRepository {
  async getMetadata(): Promise<RepositoryResponse> {
    const data = await Metadata.findOne({});
    if (!data) {
      log.warn(`Can't find Metadata from MetadataRepository`);
      return {
        success: false,
        status: 404,
        error: "Metadata not found."
      };
    }

    return {
      success: true,
      status: 200,
      data: data
    };
  }
}
