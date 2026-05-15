import { NextRequest, NextResponse } from 'next/server';

function parseAllowedOrigins() {
  return (process.env.WAITLIST_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getCorsHeaders(request: NextRequest) {
  const requestOrigin = request.headers.get('origin');
  const allowedOrigins = parseAllowedOrigins();
  const headers = new Headers();

  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '86400');

  if (allowedOrigins.includes('*')) {
    headers.set('Access-Control-Allow-Origin', '*');
    return headers;
  }

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    headers.set('Access-Control-Allow-Origin', requestOrigin);
  }

  return headers;
}

export function withCors(request: NextRequest, response: NextResponse) {
  getCorsHeaders(request).forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

export function corsJson(
  request: NextRequest,
  body: unknown,
  init?: ResponseInit,
) {
  return withCors(request, NextResponse.json(body, init));
}

export function corsOptions(request: NextRequest) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}
