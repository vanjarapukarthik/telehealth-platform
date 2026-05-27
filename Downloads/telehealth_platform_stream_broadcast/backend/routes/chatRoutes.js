import { Router } from "express";
import { sendMessage, getMessages } from "../controllers/chatController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
router.get("/messages", authenticate, getMessages);
router.post("/message", authenticate, sendMessage);
export default router;
