import express from "express";
import MetadataRepository from "../repositories/MetadataRepository";
const router = express.Router();

router.get("/metadata", async function (request, response) {
  const metadataRepository = new MetadataRepository();
  const data = await metadataRepository.getMetadata();
  response.status(data.status).json(data);
  return;
});

export { router };
