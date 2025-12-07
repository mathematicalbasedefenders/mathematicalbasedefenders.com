import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { User } from "../src/api/models/User";
import { PendingUser } from "../src/api/models/PendingUser";
import {
  getMockConfirmationCode,
  getMockPendingUserEmail,
  getMockPendingUserUsername,
  getMockUserEmail,
  getMockUserUsername
} from "./mock-data-generator";
import { sha256 } from "js-sha256";

const MOCK_USERS = 5;
const MOCK_PENDING_USERS = 2;

let mongoServer: MongoMemoryServer;

function createNewMockUser(number: number) {
  const data: Object = {
    username: getMockUserUsername(number),
    usernameInAllLowercase: getMockUserUsername(number).toLowerCase(),
    emailAddress: getMockUserEmail(number),
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

function createNewMockPendingUser(number: number) {
  const data: Object = {
    username: getMockPendingUserUsername(number),
    usernameInAllLowercase: getMockPendingUserUsername(number).toLowerCase(),
    emailAddress: getMockPendingUserEmail(number),
    hashedPassword:
      "$2a$08$uK192t0g8B7NznispY4H8.Qow2WYYI5VuXehXasl5pViDXyVq7Y4.", // "password"
    emailConfirmationLink: "", // to be fair this is unused even in production
    emailConfirmationCode: sha256(getMockConfirmationCode(number))
  };
  return data;
}

async function mockDatabaseData() {
  for (let i = 1; i <= MOCK_USERS; i++) {
    const mockUser = createNewMockUser(i);
    const newMockUser = new User(mockUser);
    await newMockUser.save();
  }
  for (let i = 1; i <= MOCK_PENDING_USERS; i++) {
    const mockPendingUser = createNewMockPendingUser(i);
    const newMockPendingUser = new PendingUser(mockPendingUser);
    await newMockPendingUser.save();
  }
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
  await mockDatabaseData();
};

export { connectToDatabase, disconnectFromDatabase, resetDatabase };
