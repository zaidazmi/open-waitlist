import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockSendEmail, mockRpcMaybeSingle } = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
  mockRpcMaybeSingle: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
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

// Import the module under test — must use require-style to ensure mocks apply
import { GET } from '@/app/api/waitlist/verify/route';

function makeRequest(token?: string) {
  const url = token
    ? `http://localhost:3000/api/waitlist/verify?token=${token}`
    : 'http://localhost:3000/api/waitlist/verify';
  return new NextRequest(url);
}

const validToken = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const baseVerification = {
  user_email: 'test@example.com',
  user_referral_code: 'abc12345',
  user_position: 1,
  user_referral_count: 0,
  referrer_email: null,
  referrer_referral_code: null,
  referrer_position: null,
  referrer_referral_count: null,
  already_verified: false,
};

describe('GET /api/waitlist/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null });
    mockRpcMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('redirects to verified page on successful verification', async () => {
    mockRpcMaybeSingle.mockResolvedValueOnce({
      data: { ...baseVerification },
      error: null,
    });

    const res = await GET(makeRequest(validToken));

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/waitlist/verified');
    expect(location).toContain('code=abc12345');
  });

  it('sends welcome email after verification', async () => {
    mockRpcMaybeSingle.mockResolvedValueOnce({
      data: { ...baseVerification },
      error: null,
    });

    await GET(makeRequest(validToken));

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const emailArgs = mockSendEmail.mock.calls[0][0];
    expect(emailArgs.to).toEqual(['test@example.com']);
    expect(emailArgs.text).toContain('abc12345');
  });

  it('sends referrer notification when referred', async () => {
    mockRpcMaybeSingle.mockResolvedValueOnce({
      data: {
        ...baseVerification,
        user_email: 'new@example.com',
        user_referral_code: 'newcode1',
        user_position: 5,
        referrer_email: 'referrer@example.com',
        referrer_referral_code: 'refcode1',
        referrer_position: 2,
        referrer_referral_count: 1,
      },
      error: null,
    });

    await GET(makeRequest(validToken));

    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    const referrerEmail = mockSendEmail.mock.calls[1][0];
    expect(referrerEmail.to).toEqual(['referrer@example.com']);
    expect(referrerEmail.text).toContain('new@example.com');
  });

  it('redirects without emails for already-verified token', async () => {
    mockRpcMaybeSingle.mockResolvedValueOnce({
      data: { ...baseVerification, already_verified: true },
      error: null,
    });

    const res = await GET(makeRequest(validToken));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('code=abc12345');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('redirects to error page for missing token', async () => {
    const res = await GET(makeRequest());

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('error=invalid_token');
  });

  it('redirects to error page for malformed token', async () => {
    const res = await GET(makeRequest('not-a-uuid'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('error=invalid_token');
  });

  it('redirects to error page when RPC fails', async () => {
    mockRpcMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'RPC error' },
    });

    const res = await GET(makeRequest(validToken));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('error=invalid_token');
  });
});
