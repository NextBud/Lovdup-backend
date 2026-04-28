import express from "express";
import { register, login, me } from "../auth/authController.js";
import { authMiddleware } from "../authMiddlware/authMiddleware.js";
import { validateBody } from "../middlewares/validator/validator.js";
import { registerSchema, loginSchema } from "../auth/authValidator.js";

const router = express.Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.get("/me", authMiddleware, me);

export default router;
