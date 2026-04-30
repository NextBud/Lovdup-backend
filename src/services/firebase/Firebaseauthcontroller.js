import asyncWrapper from "../lib/asyncWrapper.js";
import * as firebaseAuthService from "./firebaseAuthService.js";
import { BadRequestError } from "../../classes/errorClasses.js";

/**
 * POST /auth/firebase
 * Body: { idToken: string }
 *
 * The frontend calls this immediately after Firebase sign-in succeeds.
 * Returns your app JWT so the client can use it for all protected routes.
 */
export const firebaseLogin = asyncWrapper(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new BadRequestError("idToken is required");
  }

  const result = await firebaseAuthService.firebaseExchange(idToken);

  return res.status(200).json({
    success: true,
    message: "Firebase login successful",
    data: result,
  });
});
