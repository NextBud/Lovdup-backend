import admin from "firebase-admin";
import { env } from "../lib/env.js";

const serviceAccountBase64 = env.firebase.serviceAccountBase64;

if (!serviceAccountBase64) {
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is not set",
  );
}

const serviceAccount = JSON.parse(
  Buffer.from(serviceAccountBase64, "base64").toString("utf8"),
);

const firebaseApp =
  admin.apps.length === 0
    ? admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
    : admin.app();

// Use console.info here — this file is infrastructure, imported before
// any logger is guaranteed to be available.
console.info("[Firebase] Admin initialized (Base64)");

// Export the pre-instantiated auth object.
// All consumers must use firebaseAuth — never call admin.auth() directly.
export const firebaseAuth = firebaseApp.auth();
export const firebaseMessaging = firebaseApp.messaging();
