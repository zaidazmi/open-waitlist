export function getWaitlistConfig() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Open Waitlist';
  const fromEmail = process.env.WAITLIST_FROM_EMAIL || `${appName} <hello@example.com>`;
  const replyTo = process.env.WAITLIST_REPLY_TO || 'hello@example.com';
  const emailFooter =
    process.env.WAITLIST_EMAIL_FOOTER ||
    `${appName} - An open-source verified referral waitlist`;

  return {
    appName,
    emailFooter,
    fromEmail,
    replyTo,
  };
}
