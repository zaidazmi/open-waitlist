import { NextRequest } from 'next/server';
import { getResendClient } from '@/lib/resend';
import { supabaseAdmin } from '@/lib/supabase';
import { checkBotProtection } from '@/lib/bot-protection';
import { corsJson, corsOptions } from '@/lib/cors';
import { resolveApiUrl } from '@/lib/site-url';
import { getWaitlistConfig } from '@/lib/waitlist-config';
import {
  checkSignupEmailRateLimit,
  checkSignupIpRateLimit,
  getRateLimitHeaders,
} from '@/lib/rate-limit';

type WaitlistEmailTarget = {
  email: string;
  verification_token: string;
};

function generateReferralCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === '23505';
}

function tooManyRequestsResponse(request: NextRequest, headers: Headers) {
  return corsJson(
    request,
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers,
    },
  );
}

async function sendVerificationEmail(target: WaitlistEmailTarget, request: NextRequest) {
  const apiUrl = resolveApiUrl(request);
  const { appName, emailFooter, fromEmail, replyTo } = getWaitlistConfig();
  const verificationUrl = `${apiUrl}/api/waitlist/verify?token=${target.verification_token}`;

  return getResendClient().emails.send({
    from: fromEmail,
    to: [target.email],
    replyTo,
    subject: `Verify your spot on the ${appName} waitlist`,
    text: `Hi there,

Thanks for your interest in ${appName}.

Please verify your email to confirm your spot on the waitlist:

${verificationUrl}

Once verified, you'll get a referral link to move up the list.

Best,
The ${appName} Team

---
${emailFooter}`,
  });
}

async function resendExistingVerification(
  request: NextRequest,
  existing: WaitlistEmailTarget & { verified: boolean },
) {
  if (existing.verified) {
    return corsJson(request, {
      success: true,
      message: 'This email is already verified on the waitlist.',
      alreadyVerified: true,
    });
  }

  const emailRateLimit = await checkSignupEmailRateLimit(existing.email);
  if (!emailRateLimit.success) {
    return tooManyRequestsResponse(request, getRateLimitHeaders(emailRateLimit));
  }

  const { error: emailError } = await sendVerificationEmail(existing, request);

  if (emailError) {
    console.error('Verification resend failed:', emailError);
    return corsJson(
      request,
      { error: 'Failed to send verification email. Please try again.' },
      { status: 500 },
    );
  }

  return corsJson(request, {
    success: true,
    message: 'We sent a fresh verification email. Check your inbox to confirm your spot!',
    resent: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const ipRateLimit = await checkSignupIpRateLimit(request);
    if (!ipRateLimit.success) {
      return tooManyRequestsResponse(request, getRateLimitHeaders(ipRateLimit));
    }

    const body = (await request.json()) as Record<string, unknown>;
    const botProtection = checkBotProtection(body);

    if (!botProtection.success) {
      return corsJson(request, { error: botProtection.message }, { status: 400 });
    }

    const email = (body.email as string | undefined)?.trim();
    const referredBy = (body.referredBy as string | undefined)?.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return corsJson(request, { error: 'Valid email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('waitlist')
      .select('email, verified, verification_token')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingError) {
      console.error('Existing email check failed:', existingError);
      return corsJson(request, { error: 'Something went wrong' }, { status: 500 });
    }

    if (existing) {
      return resendExistingVerification(request, existing);
    }

    let referralCode = generateReferralCode();
    let attempts = 0;

    while (attempts < 5) {
      const { data: codeExists, error: codeError } = await supabaseAdmin
        .from('waitlist')
        .select('referral_code')
        .eq('referral_code', referralCode)
        .maybeSingle();

      if (codeError) {
        console.error('Referral code uniqueness check failed:', codeError);
        return corsJson(request, { error: 'Something went wrong' }, { status: 500 });
      }

      if (!codeExists) {
        break;
      }

      referralCode = generateReferralCode();
      attempts += 1;
    }

    const version = process.env.NEXT_PUBLIC_WAITLIST_VERSION || 'v1';
    const { data: newEntry, error: insertError } = await supabaseAdmin
      .from('waitlist')
      .insert({
        email: normalizedEmail,
        version,
        referral_code: referralCode,
        referred_by: referredBy || null,
      })
      .select()
      .single();

    if (insertError || !newEntry) {
      if (isUniqueViolation(insertError)) {
        const { data: duplicate, error: duplicateError } = await supabaseAdmin
          .from('waitlist')
          .select('email, verified, verification_token')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (!duplicateError && duplicate) {
          return resendExistingVerification(request, duplicate);
        }
      }

      console.error('Waitlist insert failed:', insertError);
      return corsJson(request, { error: 'Failed to add to waitlist' }, { status: 500 });
    }

    const { error: emailError } = await sendVerificationEmail(newEntry, request);

    if (emailError) {
      console.error('Verification email failed:', emailError);
      return corsJson(
        request,
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 },
      );
    }

    return corsJson(request, {
      success: true,
      message: 'Check your email to verify your spot!',
    });
  } catch (error) {
    console.error('Waitlist request failed:', error);
    return corsJson(request, { error: 'Something went wrong' }, { status: 500 });
  }
}

export function OPTIONS(request: NextRequest) {
  return corsOptions(request);
}
