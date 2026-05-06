import asyncWrapper from "../../lib/asyncWrapper.js";
import * as walletService from "./wallet.service.js";

export const getMyWallet = asyncWrapper(async (req, res) => {
  const userId = req.user.id;

  const wallet = await walletService.getMyWallet(userId);

  res.status(200).json({
    success: true,
    message: "Wallet fetched successfully",
    data: wallet,
  });
});

export const getMyWalletTransactions = asyncWrapper(async (req, res) => {
  const userId = req.user.id;

  const transactions = await walletService.getMyWalletTransactions({
    userId,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    message: "Wallet transactions fetched successfully",
    data: transactions,
  });
});
