import { NotFoundException } from "../../../classes/errorClasses.js";
import { CoinPackages } from "./coinPackages.config.js";

export const getPopularPackage = () => {
  return CoinPackages.find((item) => item.popular);
};

export const getPackages = () => {
    return CoinPackages;
};

export const getPackageById = (packageId) => {
  const pkg = CoinPackages.find((item) => item.id === packageId);

  if (!pkg) {
    throw new NotFoundException("Coin package not found");
  }

  return pkg;
};

export const packageExists = (packageId) => {
  return CoinPackages.some((item) => item.id === packageId);
};
