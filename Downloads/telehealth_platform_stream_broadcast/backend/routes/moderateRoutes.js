import { Router } from "express";
import { kickViewer } from "../controllers/streamController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();
router.post("/kick", authenticate, requireRole("doctor", "admin"), kickViewer);
export default router;
