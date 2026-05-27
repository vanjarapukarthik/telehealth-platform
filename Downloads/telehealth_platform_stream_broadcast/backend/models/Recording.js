import mongoose from "mongoose";

const recordingSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    roomName: {
      type: String,
      required: true,
    },
    egressId: {
      type: String,
      required: true,
    },
    filepath: {
      type: String,
      default: "",
    },
    duration: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["recording", "completed", "failed"],
      default: "recording",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Recording", recordingSchema);
