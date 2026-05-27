import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { getConfig, updateConfig } from "../controllers/streamConfigController.js";

const router = Router();
router.get("/", authenticate, requireRole("doctor", "admin"), getConfig);
router.post("/", authenticate, requireRole("doctor", "admin"), updateConfig);
export default router;
