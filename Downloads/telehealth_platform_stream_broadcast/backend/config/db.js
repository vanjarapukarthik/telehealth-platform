import mongoose from "mongoose";

const MONGO_OPTIONS = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 30_000,
  connectTimeoutMS: 20_000,
  socketTimeoutMS: 45_000,
  // Atlas / some networks: avoid IPv6/DNS issues (Node -> Mongo handshake hangs)
  family: 4,
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/telehealth";

  if (!String(uri).trim()) {
    console.error("MongoDB: set MONGODB_URI in backend/.env (e.g. mongodb://127.0.0.1:27017/telehealth or your Atlas SRV string)");
    process.exit(1);
  }

  mongoose.set("strictQuery", true);
  // Fail fast on queries if disconnected, instead of "buffering timed out after 10000ms"
  mongoose.set("bufferCommands", false);

  try {
    const conn = await mongoose.connect(uri, MONGO_OPTIONS);
    console.log(`MongoDB connected: ${conn.connection.host} (${conn.connection.name})`);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    console.error(
      "Check: 1) MongoDB running locally, or 2) Atlas: Network Access allow your IP, 3) MONGODB_URI user/password correct, 4) cluster not paused"
    );
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });
  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected");
  });
};

export default connectDB;
