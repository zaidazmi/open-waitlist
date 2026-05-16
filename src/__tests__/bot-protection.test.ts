import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkBotProtection } from '@/lib/bot-protection';

describe('checkBotProtection', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.WAITLIST_BOT_PROTECTION_ENABLED = 'true';
    process.env.WAITLIST_HONEYPOT_FIELD = 'website';
    process.env.WAITLIST_BOT_MIN_SUBMIT_MS = '900';
    process.env.WAITLIST_BOT_MAX_SUBMIT_MS = '86400000';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('passes when honeypot is empty and timing is valid', () => {
    const result = checkBotProtection({
      website: '',
      submittedAt: Date.now() - 2000,
    });
    expect(result.success).toBe(true);
  });

  it('fails when honeypot field is filled', () => {
    const result = checkBotProtection({
      website: 'http://spam.com',
      submittedAt: Date.now() - 2000,
    });
    expect(result.success).toBe(false);
  });

  it('fails when form is submitted too quickly', () => {
    const result = checkBotProtection({
      website: '',
      submittedAt: Date.now() - 100,
    });
    expect(result.success).toBe(false);
  });

  it('fails when submittedAt is missing', () => {
    const result = checkBotProtection({ website: '' });
    expect(result.success).toBe(false);
  });

  it('fails when submittedAt is not a number', () => {
    const result = checkBotProtection({ website: '', submittedAt: 'abc' });
    expect(result.success).toBe(false);
  });

  it('passes everything when bot protection is disabled', () => {
    process.env.WAITLIST_BOT_PROTECTION_ENABLED = 'false';

    const result = checkBotProtection({
      website: 'http://spam.com',
    });
    expect(result.success).toBe(true);
  });

  it('fails when form submission is too old', () => {
    const result = checkBotProtection({
      website: '',
      submittedAt: Date.now() - 100_000_000,
    });
    expect(result.success).toBe(false);
  });
});
