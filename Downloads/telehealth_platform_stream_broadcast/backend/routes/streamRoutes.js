import { Router } from "express";
import { startRtmp, startRecord } from "../controllers/streamController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();
router.post("/rtmp", authenticate, requireRole("doctor", "admin"), startRtmp);
router.post("/record", authenticate, requireRole("doctor", "admin"), startRecord);
export default router;
