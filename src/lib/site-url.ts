import { NextRequest } from 'next/server';

function normalizeConfiguredSiteUrl(url: string) {
  return url.replace(/\/+$/, '');
}

function getForwardedHost(request: NextRequest) {
  return request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host;
}

function getForwardedProtocol(request: NextRequest, host: string) {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto;
  }

  const hostname = host.replace(/^\[|\]$/g, '').split(':')[0].toLowerCase();
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  return isLocal ? 'http' : request.nextUrl.protocol.replace(':', '') || 'https';
}

function isLocalHost(host: string) {
  const hostname = host.replace(/^\[|\]$/g, '').split(':')[0].toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function resolveSiteUrl(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const host = getForwardedHost(request);
  const protocol = getForwardedProtocol(request, host);
  const requestOrigin = `${protocol}://${host}`;

  // For local submissions, always emit local verification/referral links.
  if (isLocalHost(host)) {
    return requestOrigin;
  }

  if (configured) {
    return normalizeConfiguredSiteUrl(configured);
  }

  return requestOrigin;
}

export function resolveApiUrl(request: NextRequest) {
  const configured = process.env.WAITLIST_API_URL?.trim();
  const host = getForwardedHost(request);
  const protocol = getForwardedProtocol(request, host);
  const requestOrigin = `${protocol}://${host}`;

  if (isLocalHost(host)) {
    return requestOrigin;
  }

  if (configured) {
    return normalizeConfiguredSiteUrl(configured);
  }

  return requestOrigin;
}

export function resolveVerifiedRedirectUrl(request: NextRequest, referralCode: string) {
  const configured = process.env.WAITLIST_SUCCESS_URL?.trim();
  const baseUrl = configured
    ? normalizeConfiguredSiteUrl(configured)
    : `${resolveApiUrl(request)}/waitlist/verified`;
  const redirectUrl = new URL(baseUrl);

  redirectUrl.searchParams.set('code', referralCode);

  return redirectUrl;
}
