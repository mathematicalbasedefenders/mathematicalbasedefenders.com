import mongoose from "mongoose";

interface MetadataInterface {
  _id: mongoose.Schema.Types.ObjectId;
  usersRegistered: number;
  documentIsMetadata: boolean;
}

interface MetadataModel extends mongoose.Model<MetadataInterface> {}

const MetadataSchema = new mongoose.Schema<MetadataInterface, MetadataModel>(
  {
    _id: mongoose.Schema.Types.ObjectId,
    usersRegistered: Number,
    documentIsMetadata: Boolean
  },
  { collection: "metadata" }
);

const Metadata = mongoose.model<MetadataInterface, MetadataModel>(
  "Metadata",
  MetadataSchema,
  "metadata"
);

export default Metadata;
