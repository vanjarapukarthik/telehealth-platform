import { Router } from "express";
import {
  listSessions,
  createSession,
  endSession,
  listRecordings,
} from "../controllers/sessionController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();
router.get("/", authenticate, listSessions);
router.post("/", authenticate, requireRole("doctor", "admin"), createSession);
router.post("/:roomName/end", authenticate, requireRole("doctor", "admin"), endSession);
router.get("/recordings", authenticate, listRecordings);
export default router;
