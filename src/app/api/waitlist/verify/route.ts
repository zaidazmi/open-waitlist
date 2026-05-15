import { NextRequest, NextResponse } from 'next/server';
import { getResendClient } from '@/lib/resend';
import { supabaseAdmin } from '@/lib/supabase';
import { corsOptions } from '@/lib/cors';
import { resolveSiteUrl, resolveVerifiedRedirectUrl } from '@/lib/site-url';
import { getWaitlistConfig } from '@/lib/waitlist-config';

type VerificationResult = {
  user_email: string;
  user_referral_code: string;
  user_position: number;
  user_referral_count: number;
  referrer_email: string | null;
  referrer_referral_code: string | null;
  referrer_position: number | null;
  referrer_referral_count: number | null;
  already_verified: boolean;
};

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token || !uuidRegex.test(token)) {
      return NextResponse.redirect(new URL('/?error=invalid_token', request.url));
    }

    const { data: verification, error: verificationError } = await supabaseAdmin
      .rpc('verify_waitlist_signup', { token })
      .maybeSingle<VerificationResult>();

    if (verificationError || !verification) {
      if (verificationError) {
        console.error('Verification RPC failed:', verificationError);
      }

      return NextResponse.redirect(new URL('/?error=invalid_token', request.url));
    }

    if (verification.already_verified) {
      return NextResponse.redirect(
        resolveVerifiedRedirectUrl(request, verification.user_referral_code),
      );
    }

    const siteUrl = resolveSiteUrl(request);
    const { appName, emailFooter, fromEmail, replyTo } = getWaitlistConfig();
    const referralLink = `${siteUrl}?ref=${verification.user_referral_code}`;

    const { error: emailError } = await getResendClient().emails.send({
      from: fromEmail,
      to: [verification.user_email],
      replyTo,
      subject: `You're on the ${appName} waitlist!`,
      text: `Hi there,

Welcome to the ${appName} waitlist. You're currently #${verification.user_position}.

Want to move up the list? Share your referral link with friends:

${referralLink}

Each friend who verifies their email moves you up 1 spot!

Best,
The ${appName} Team

---
${emailFooter}`,
    });

    if (emailError) {
      console.error('Welcome email failed:', emailError);
    }

    if (verification.referrer_email && verification.referrer_referral_code) {
      const referrerLink = `${siteUrl}?ref=${verification.referrer_referral_code}`;

      const { error: referrerEmailError } = await getResendClient().emails.send({
        from: fromEmail,
        to: [verification.referrer_email],
        replyTo,
        subject: `Someone joined ${appName} using your referral link!`,
        text: `Hi there,

Great news! ${verification.user_email} just joined the ${appName} waitlist using your referral link and verified their email.

Your updated position: #${verification.referrer_position}

You moved up 1 spot! Keep sharing your referral link to move up even more:

${referrerLink}

Each verified referral moves you up 1 position.

Best,
The ${appName} Team

---
${emailFooter}`,
      });

      if (referrerEmailError) {
        console.error('Referrer notification email failed:', referrerEmailError);
      }
    }

    return NextResponse.redirect(resolveVerifiedRedirectUrl(request, verification.user_referral_code));
  } catch (error) {
    console.error('Verification flow failed:', error);
    return NextResponse.redirect(new URL('/?error=verification_failed', request.url));
  }
}

export function OPTIONS(request: NextRequest) {
  return corsOptions(request);
}
