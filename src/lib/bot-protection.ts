type BotProtectionResult =
  | {
      success: true;
    }
  | {
      success: false;
      message: string;
    };

function readPositiveInt(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function isBotProtectionEnabled() {
  return process.env.WAITLIST_BOT_PROTECTION_ENABLED?.toLowerCase() !== 'false';
}

function getTextValue(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function checkBotProtection(body: Record<string, unknown>): BotProtectionResult {
  if (!isBotProtectionEnabled()) {
    return { success: true };
  }

  const honeypotField = process.env.WAITLIST_HONEYPOT_FIELD || 'website';
  const honeypotValue = getTextValue(body, honeypotField);

  if (honeypotValue) {
    return {
      success: false,
      message: 'Unable to accept this signup. Please try again.',
    };
  }

  const submittedAt = Number(body.submittedAt);
  if (!Number.isFinite(submittedAt)) {
    return {
      success: false,
      message: 'Unable to accept this signup. Please refresh and try again.',
    };
  }

  const elapsedMs = Date.now() - submittedAt;
  const minMs = readPositiveInt('WAITLIST_BOT_MIN_SUBMIT_MS', 900);
  const maxMs = readPositiveInt('WAITLIST_BOT_MAX_SUBMIT_MS', 24 * 60 * 60_000);

  if (elapsedMs < minMs || elapsedMs > maxMs) {
    return {
      success: false,
      message: 'Unable to accept this signup. Please try again.',
    };
  }

  return { success: true };
}
