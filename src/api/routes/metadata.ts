import express from "express";
import MetadataRepository from "../repositories/MetadataRepository";
const router = express.Router();

router.get("/metadata", async function (request, response, next) {
  try {
    const metadataRepository = new MetadataRepository();
    const data = await metadataRepository.getMetadata();
    response.status(data.status).json(data);
  } catch (error) {
    next(error);
  }
  return;
});

export { router };
