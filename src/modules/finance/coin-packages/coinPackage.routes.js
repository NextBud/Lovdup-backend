import { Router } from "express";
import * as controller from "./coinController.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";

const packageRouter = Router();

packageRouter.get("/", controller.getCoinPackages);

packageRouter.get("/:packageId", controller.getCoinPackageById);

export default packageRouter;
