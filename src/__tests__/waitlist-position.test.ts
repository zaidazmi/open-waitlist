import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockRpcMaybeSingle } = vi.hoisted(() => ({
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

import { GET } from '@/app/api/waitlist/position/route';

function makeRequest(code?: string) {
  const url = code
    ? `http://localhost:3000/api/waitlist/position?code=${code}`
    : 'http://localhost:3000/api/waitlist/position';
  return new NextRequest(url);
}

describe('GET /api/waitlist/position', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpcMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('returns position and referral link for valid code', async () => {
    mockRpcMaybeSingle.mockResolvedValueOnce({
      data: { position: 3, referral_count: 2, referral_code: 'abc12345' },
      error: null,
    });

    const res = await GET(makeRequest('abc12345'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.position).toBe(3);
    expect(json.referralCount).toBe(2);
    expect(json.referralLink).toContain('ref=abc12345');
  });

  it('returns 400 when code is missing', async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('required');
  });

  it('returns 404 for nonexistent code', async () => {
    const res = await GET(makeRequest('nonexistent'));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toContain('not found');
  });

  it('returns 404 when RPC errors', async () => {
    mockRpcMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error' },
    });

    const res = await GET(makeRequest('abc12345'));

    expect(res.status).toBe(404);
  });

  it('builds referral link from request host', async () => {
    mockRpcMaybeSingle.mockResolvedValueOnce({
      data: { position: 1, referral_count: 0, referral_code: 'xyz99999' },
      error: null,
    });

    const res = await GET(makeRequest('xyz99999'));
    const json = await res.json();

    expect(json.referralLink).toBe('http://localhost:3000?ref=xyz99999');
  });
});
