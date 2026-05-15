import { Resend } from 'resend';

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is required to send waitlist emails.');
  }

  return new Resend(apiKey);
}
