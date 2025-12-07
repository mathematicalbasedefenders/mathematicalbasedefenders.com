import {
  connectToDatabase,
  disconnectFromDatabase,
  resetDatabase
} from "./database-helper";

import path from "path";

require("@dotenvx/dotenvx").config({
  path: path.join(__dirname, "../credentials/.env")
});

exports.mochaHooks = {
  async beforeAll() {
    if (process.env.CREDENTIAL_SET_USED === "production") {
      console.error(
        "Skipping tests because environment variable is set to production mode."
      );
      process.exit(1);
    }
    await connectToDatabase();
  },

  async beforeEach() {
    // for good measure
    if (process.env.CREDENTIAL_SET_USED === "production") {
      console.error(
        "Skipping tests because environment variable is set to production mode."
      );
      process.exit(1);
    }
    await resetDatabase();
  },

  async afterAll() {
    await disconnectFromDatabase();
  }
};
