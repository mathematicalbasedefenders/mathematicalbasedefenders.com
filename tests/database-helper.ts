import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { User } from "../src/api/models/User";

let mongoServer: MongoMemoryServer;

function createNewUser(number: number) {
  const id = number.toString().padStart(3, "0");
  const data: Object = {
    username: `User${id}`,
    usernameInAllLowercase: `user${id}`,
    emailAddress: `user${id}@example.com`,
    hashedPassword:
      "$2a$08$uK192t0g8B7NznispY4H8.Qow2WYYI5VuXehXasl5pViDXyVq7Y4.", // "password"
    creationDateAndTime: new Date(),
    statistics: {
      gamesPlayed: 0
    },
    membership: {
      isDeveloper: false,
      isAdministrator: false,
      isModerator: false,
      isContributor: false,
      isTester: false,
      isDonator: false,
      specialRank: ""
    }
  };
  return data;
}

const connectToDatabase = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

const disconnectFromDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};

const resetDatabase = async () => {
  await mongoose.connection.dropDatabase();
  const MOCK_USERS = 5;
  for (let i = 1; i <= MOCK_USERS; i++) {
    const mockUser = createNewUser(i);
    const newMockUser = new User(mockUser);
    await newMockUser.save();
  }
};

export { connectToDatabase, disconnectFromDatabase, resetDatabase };
