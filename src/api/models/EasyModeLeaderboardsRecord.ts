import mongoose from "mongoose";

interface EasyModeLeaderboardsRecordInterface {
  rankNumber: number;
  userIDOfHolder: string;
  score: number;
  timeInMilliseconds: number;
  scoreSubmissionDateAndTime: Date;
  enemiesKilled: number;
  enemiesCreated: number;
  actionsPerformed: number;
}

interface EasyModeLeaderboardsRecordModel
  extends mongoose.Model<EasyModeLeaderboardsRecordInterface> {
  getAll(): Promise<EasyModeLeaderboardsRecordInterface>;
}

const EasyModeLeaderboardsRecordSchema = new mongoose.Schema<
  EasyModeLeaderboardsRecordInterface,
  EasyModeLeaderboardsRecordModel
>({
  rankNumber: Number,
  userIDOfHolder: String,
  score: Number,
  timeInMilliseconds: Number,
  scoreSubmissionDateAndTime: Date,
  enemiesKilled: Number,
  enemiesCreated: Number,
  actionsPerformed: Number
});

EasyModeLeaderboardsRecordSchema.static("getAll", async function () {
  return this.find({ rankNumber: { $lt: 51 } })
    .clone()
    .sort({ rankNumber: 1 });
});

const EasyModeLeaderboardsRecord = mongoose.model<
  EasyModeLeaderboardsRecordInterface,
  EasyModeLeaderboardsRecordModel
>(
  "EasyModeLeaderboardsRecord",
  EasyModeLeaderboardsRecordSchema,
  "easyModeLeaderboardsRecords"
);

export { EasyModeLeaderboardsRecord, EasyModeLeaderboardsRecordInterface };
