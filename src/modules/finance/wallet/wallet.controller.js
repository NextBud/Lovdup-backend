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

export const initializeWallet = asyncWrapper(async (req, res) => {
  const userId = req.user.id;

  const wallet = await walletService.initializeWallet(userId);

  res.status(201).json({
    success: true,
    message: "Wallet initialized successfully",
    data: wallet,
  });
});

export const creditCoins = asyncWrapper(async (req, res) => {
  const userId = req.user.id;
  const { coins, reason, referenceType, referenceId, metadata } = req.body;

  const result = await walletService.creditCoins({
    userId,
    coins,
    reason,
    referenceType,
    referenceId,
    metadata,
  });

  res.status(200).json({
    success: true,
    message: "Coins credited successfully",
    data: result,
  });
});

export const debitCoins = asyncWrapper(async (req, res) => {
  const userId = req.user.id;
  const { coins, reason, referenceType, referenceId, metadata } = req.body;

  const result = await walletService.debitCoins({
    userId,
    coins,
    reason,
    referenceType,
    referenceId,
    metadata,
  });

  res.status(200).json({
    success: true,
    message: "Coins debited successfully",
    data: result,
  });
});

export const refundCoins = asyncWrapper(async (req, res) => {
  const userId = req.user.id;
  const { coins, reason, referenceType, referenceId, metadata } = req.body;

  const result = await walletService.refundCoins({
    userId,
    coins,
    reason,
    referenceType,
    referenceId,
    metadata,
  });

  res.status(200).json({
    success: true,
    message: "Coins refunded successfully",
    data: result,
  });
});
