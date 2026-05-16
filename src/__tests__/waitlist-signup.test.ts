import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockSendEmail, mockMaybeSingle, mockSingle, mockEq, mockInsert, mockRpcMaybeSingle } = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn();
  const mockSingle = vi.fn();
  const mockEq = vi.fn();
  const mockInsert = vi.fn();
  return {
    mockSendEmail: vi.fn(),
    mockMaybeSingle,
    mockSingle,
    mockEq,
    mockInsert,
    mockRpcMaybeSingle: vi.fn(),
  };
});

const mockChain = {
  select: vi.fn().mockReturnThis(),
  insert: mockInsert,
  eq: mockEq,
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
};
mockInsert.mockReturnValue(mockChain);
mockEq.mockReturnValue(mockChain);

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockImplementation(() => mockChain),
    rpc: vi.fn().mockImplementation(() => ({
      maybeSingle: mockRpcMaybeSingle,
    })),
  },
  supabaseClient: {},
}));

vi.mock('@/lib/resend', () => ({
  getResendClient: () => ({
    emails: { send: mockSendEmail },
  }),
}));

import { POST } from '@/app/api/waitlist/route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/waitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue(mockChain);
    mockEq.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();

    // Rate limit passes
    mockRpcMaybeSingle.mockResolvedValue({
      data: { allowed: true, remaining: 9, reset_at: new Date(Date.now() + 60000).toISOString(), retry_after_seconds: 60 },
      error: null,
    });

    // No existing user
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    // Insert succeeds
    mockSingle.mockResolvedValue({
      data: {
        email: 'test@example.com',
        verification_token: '00000000-0000-0000-0000-000000000001',
        referral_code: 'abc12345',
      },
      error: null,
    });

    // Email sends
    mockSendEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  });

  it('creates a signup and sends verification email', async () => {
    const res = await POST(makeRequest({ email: 'test@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain('email');
    expect(mockSendEmail).toHaveBeenCalledOnce();
  });

  it('rejects missing email', async () => {
    const res = await POST(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('email');
  });

  it('rejects invalid email format', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('email');
  });

  it('returns success for already-verified email', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        email: 'test@example.com',
        verified: true,
        verification_token: '00000000-0000-0000-0000-000000000001',
      },
      error: null,
    });

    const res = await POST(makeRequest({ email: 'test@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.alreadyVerified).toBe(true);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('resends verification for unverified duplicate', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        email: 'test@example.com',
        verified: false,
        verification_token: '00000000-0000-0000-0000-000000000001',
      },
      error: null,
    });

    const res = await POST(makeRequest({ email: 'test@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.resent).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledOnce();
  });

  it('returns 500 when email sending fails', async () => {
    mockSendEmail.mockResolvedValueOnce({
      data: null,
      error: { message: 'Resend error' },
    });

    const res = await POST(makeRequest({ email: 'test@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toContain('email');
  });
});
