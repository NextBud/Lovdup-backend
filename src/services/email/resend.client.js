import { Resend } from "resend";

const API_KEY = process.env.RESEND_API_KEY;

if (!API_KEY) {
  throw new Error("RESEND_API_KEY is missing");
}

export const resend = new Resend(API_KEY);
