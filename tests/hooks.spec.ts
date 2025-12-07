import {
  connectToDatabase,
  disconnectFromDatabase,
  resetDatabase
} from "./database-helper";

exports.mochaHooks = {
  async beforeAll() {
    await connectToDatabase();
  },

  async beforeEach() {
    await resetDatabase();
  },

  async afterAll() {
    await disconnectFromDatabase();
  }
};
