import { getApps, initializeApp, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
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

// Initialize using the modern modular approach
const firebaseApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount), // Changed from credential.cert to just cert
      })
    : getApp();

console.info("[Firebase] Admin initialized (Base64)");

export const firebaseAuth = getAuth(firebaseApp);
export const firebaseMessaging = getMessaging(firebaseApp);