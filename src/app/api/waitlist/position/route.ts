import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { corsJson, corsOptions } from '@/lib/cors';
import { resolveSiteUrl } from '@/lib/site-url';

type PositionResult = {
  position: number;
  referral_count: number;
  referral_code: string;
};

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');

    if (!code) {
      return corsJson(request, { error: 'Referral code is required' }, { status: 400 });
    }

    const { data: user, error: fetchError } = await supabaseAdmin
      .rpc('waitlist_rank_for_code', { ref_code: code })
      .maybeSingle<PositionResult>();

    if (fetchError || !user) {
      if (fetchError) {
        console.error('Position rank lookup failed:', fetchError);
      }

      return corsJson(request, { error: 'User not found or not verified yet' }, { status: 404 });
    }

    const siteUrl = resolveSiteUrl(request);
    const referralLink = `${siteUrl}?ref=${user.referral_code}`;

    return corsJson(request, {
      position: user.position,
      referralCount: user.referral_count,
      referralLink,
    });
  } catch (error) {
    console.error('Position lookup failed:', error);
    return corsJson(request, { error: 'Something went wrong' }, { status: 500 });
  }
}

export function OPTIONS(request: NextRequest) {
  return corsOptions(request);
}
