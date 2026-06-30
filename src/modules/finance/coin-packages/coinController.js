import asyncWrapper from "../../../lib/asyncWrapper.js";
import * as coinPackageService from "./coinPackage.service.js";

export const getCoinPackages = asyncWrapper(async (req, res) => {
  const packages = coinPackageService.getPackages();

  res.status(200).json({
    success: true,
    message: "Coin packages fetched successfully.",
    data: packages,
  });
});

export const getCoinPackageById = asyncWrapper(async (req, res) => {
  const { packageId } = req.params;

  const coinPackage = coinPackageService.getPackageById(packageId);

  res.status(200).json({
    success: true,
    message: "Coin package fetched successfully.",
    data: coinPackage,
  });
});
