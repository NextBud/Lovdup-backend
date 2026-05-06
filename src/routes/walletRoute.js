import express from "express";
import { getMyWallet, getMyWalletTransactions } from "./wallet.controller.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/me", getMyWallet);
router.get("/me/transactions", getMyWalletTransactions);

export default router;
