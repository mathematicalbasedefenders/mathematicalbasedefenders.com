const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join("./credentials/.env") });

exports.mochaHooks = {
  beforeAll() {
    const DATABASE_URI = process.env.DATABASE_CONNECTION_URI;
    mongoose.connect(DATABASE_URI);
  },

  afterAll() {
    mongoose.disconnect();
  }
};
