import mongoose from "mongoose";

interface StandardModeLeaderboardsRecordInterface {
  rankNumber: number;
  userIDOfHolder: string;
  score: number;
  timeInMilliseconds: number;
  scoreSubmissionDateAndTime: Date;
  enemiesKilled: number;
  enemiesCreated: number;
  actionsPerformed: number;
}

interface StandardModeLeaderboardsRecordModel
  extends mongoose.Model<StandardModeLeaderboardsRecordInterface> {}

const StandardModeLeaderboardsRecordSchema = new mongoose.Schema<
  StandardModeLeaderboardsRecordInterface,
  StandardModeLeaderboardsRecordModel
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

const StandardModeLeaderboardsRecord = mongoose.model<
  StandardModeLeaderboardsRecordInterface,
  StandardModeLeaderboardsRecordModel
>("StandardModeLeaderboardsRecord", StandardModeLeaderboardsRecordSchema);

export default StandardModeLeaderboardsRecord;
