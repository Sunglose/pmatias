import { Router } from "express";
import { login, me } from "../controllers/auth.controller.js";
import { authRequired } from "../middlewares/auth.middleware.js";

const router = Router();

// Auth
router.post("/login", login);

router.get("/me", authRequired, me);

export default router;