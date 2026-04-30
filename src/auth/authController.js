import * as authService from "./authService.js";
import asyncWrapper from "../lib/asyncWrapper.js";

export const register = asyncWrapper(async (req, res) => {
  const result = await authService.registerUser(req.body);

  return res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: result,
  });
});

export const login = asyncWrapper(async (req, res) => {
  const result = await authService.loginUser(req.body);

  return res.status(200).json({
    success: true,
    message: "Login successful",
    data: result,
  });
});

export const me = asyncWrapper(async (req, res) => {
  const result = await authService.getCurrentUser(req.user.userId);
  return res.status(200).json({
    success: true,
    data: result,
  });
});
