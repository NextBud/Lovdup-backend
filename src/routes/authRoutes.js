import express from "express";
import { register, login, me } from "../auth/authController.js";
import { authMiddleware } from "../authMiddlware/authMiddleware.js";
import { validateBody } from "../middlewares/validator/validator.js";
import { registerSchema, loginSchema } from "../auth/authValidator.js";

const authRouter = express.Router();

authRouter.post("/register", validateBody(registerSchema), register);
authRouter.post("/login", validateBody(loginSchema), login);
authRouter.get("/me", authMiddleware, me);

export default authRouter;
