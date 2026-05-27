import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/telehealth";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const demoUsers = [
    { email: "doctor@telehealth.demo", password: "doctor123", name: "Dr. Sarah Smith", role: "doctor", specialization: "General Practice" },
    { email: "patient@telehealth.demo", password: "patient123", name: "John Doe", role: "patient" },
    { email: "doctor@telehealth.com", password: "doctor123", name: "Dr. Sarah Smith", role: "doctor", specialization: "General Practice" },
    { email: "patient@telehealth.com", password: "patient123", name: "John Doe", role: "patient" },
  ];
  let created = 0;
  for (const u of demoUsers) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      await User.create(u);
      created++;
    }
  }
  if (created > 0) {
    console.log("Seeded demo users. Use doctor@telehealth.demo or doctor@telehealth.com / doctor123");
  } else {
    console.log("Demo users already exist.");
  }
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
