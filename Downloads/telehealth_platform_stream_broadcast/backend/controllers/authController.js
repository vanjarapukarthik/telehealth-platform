import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "telehealth-jwt-secret-change-in-production";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm }).select("+password");
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (role && user.role !== role) {
      return res.status(403).json({ error: `Access denied. This account is ${user.role}, not ${role}.` });
    }
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    const profile = await User.findById(user._id).select("-password");
    res.json({
      token,
      user: {
        id: profile._id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        specialization: profile.specialization,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};
