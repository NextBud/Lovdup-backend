import { NotFoundException } from "../../../classes/errorClasses.js";
import { CoinPackages } from "./coinPackages.config.js";

export const getPopularPackage = () => {
  const [id, pkg] =
    Object.entries(CoinPackages).find(([, pkg]) => pkg.popular) ?? [];

  return pkg ? { id, ...pkg } : null;
};

export const getPackages = () => {
  return Object.entries(CoinPackages).map(([id, pkg]) => ({
    id,
    ...pkg,
  }));
};

export const getPackageById = (packageId) => {
  const pkg = CoinPackages[packageId];

  if (!pkg) {
    throw new NotFoundException("Coin package not found");
  }

  return {
    id: packageId,
    ...pkg,
  };
};

export const packageExists = (packageId) => {
  return packageId in CoinPackages;
};
