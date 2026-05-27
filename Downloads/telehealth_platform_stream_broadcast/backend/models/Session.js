import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      trim: true,
      default: "Live Consultation",
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "ended"],
      default: "scheduled",
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    viewerCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Session", sessionSchema);
