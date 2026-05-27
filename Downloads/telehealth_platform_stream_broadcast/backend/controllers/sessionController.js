import Session from "../models/Session.js";
import Recording from "../models/Recording.js";

export const listSessions = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "doctor") {
      query.doctorId = req.user._id;
    }
    const sessions = await Session.find(query)
      .populate("doctorId", "name email specialization")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ sessions });
  } catch (err) {
    console.error("Sessions list error:", err);
    res.status(500).json({ error: "Failed to list sessions" });
  }
};

export const createSession = async (req, res) => {
  try {
    const { roomName, title } = req.body ?? {};
    const name = (roomName || "").trim() || `room-${Date.now()}`;
    const existing = await Session.findOne({ roomName: name, status: "live" });
    if (existing) {
      return res.status(409).json({ error: "Room already in use" });
    }
    const session = await Session.create({
      roomName: name,
      doctorId: req.user._id,
      title: title || "Live Consultation",
      status: "live",
      startedAt: new Date(),
    });
    const populated = await Session.findById(session._id).populate("doctorId", "name email specialization");
    res.status(201).json(populated);
  } catch (err) {
    console.error("Create session error:", err);
    res.status(500).json({ error: "Failed to create session" });
  }
};

export const endSession = async (req, res) => {
  try {
    const { roomName } = req.params;
    const session = await Session.findOne({ roomName, doctorId: req.user._id });
    if (!session) return res.status(404).json({ error: "Session not found" });
    session.status = "ended";
    session.endedAt = new Date();
    await session.save();
    res.json(session);
  } catch (err) {
    console.error("End session error:", err);
    res.status(500).json({ error: "Failed to end session" });
  }
};

export const listRecordings = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "doctor") {
      const sessions = await Session.find({ doctorId: req.user._id }).select("_id");
      query.sessionId = { $in: sessions.map((s) => s._id) };
    }
    const recordings = await Recording.find(query)
      .populate("sessionId")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ recordings });
  } catch (err) {
    console.error("Recordings list error:", err);
    res.status(500).json({ error: "Failed to list recordings" });
  }
};
