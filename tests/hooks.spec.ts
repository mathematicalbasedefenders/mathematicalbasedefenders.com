const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join("./credentials/.env") });

exports.mochaHooks = {
  async beforeAll() {
    try {
      const DATABASE_URI = process.env.DATABASE_CONNECTION_URI;
      if (!DATABASE_URI) {
        throw new Error("DATABASE_CONNECTION_URI is not defined");
      }
      await mongoose.connect(DATABASE_URI);
    } catch (error) {
      console.error("Failed to connect to database:", error);
      throw error;
    }
  },
  async afterAll() {
    try {
      await mongoose.disconnect();
    } catch (error) {
      console.error("Failed to disconnect from database:", error);
      throw error;
    }
  }
};
