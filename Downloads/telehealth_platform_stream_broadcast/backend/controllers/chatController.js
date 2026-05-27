import Message from "../models/Message.js";

export const sendMessage = async (req, res) => {
  try {
    const { roomName, content } = req.body ?? {};
    if (!roomName || !content?.trim()) {
      return res.status(400).json({ error: "roomName and content are required" });
    }
    const msg = await Message.create({
      roomName: roomName.trim(),
      userId: req.user?._id,
      senderName: req.user?.name || "Anonymous",
      senderRole: req.user?.role || "patient",
      content: content.trim(),
    });
    const populated = await Message.findById(msg._id).populate("userId", "name");
    res.status(201).json(populated);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { roomName } = req.query;
    if (!roomName) {
      return res.status(400).json({ error: "roomName query is required" });
    }
    const messages = await Message.find({ roomName: roomName.trim() })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();
    res.json({ messages });
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ error: "Failed to get messages" });
  }
};
