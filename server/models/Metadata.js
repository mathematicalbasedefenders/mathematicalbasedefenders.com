const mongoose = require("mongoose");

const MetadataSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  usersRegistered: Number,
  documentIsMetadata: Boolean
});

module.exports = mongoose.model("Metadata", MetadataSchema, "metadata");
