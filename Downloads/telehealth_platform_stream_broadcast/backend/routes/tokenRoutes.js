import { Router } from "express";
import { getToken } from "../controllers/tokenController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
router.get("/", authenticate, getToken);
export default router;
