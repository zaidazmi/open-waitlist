'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Copy, Share2 } from 'lucide-react';
import { captureAnalyticsEvent } from '@/lib/analytics';
import styles from './styles.module.css';

type WaitlistPositionResponse = {
  position: number;
  referralCount: number;
  referralLink: string;
};

function VerifiedPageContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Open Waitlist';

  const [position, setPosition] = useState<number | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const missingCodeError = code ? null : 'Missing referral code.';
  const pageLoading = Boolean(code) && loading;
  const pageError = missingCodeError || error;

  useEffect(() => {
    if (!code) {
      return;
    }

    let cancelled = false;

    const loadPosition = async () => {
      try {
        const response = await fetch(`/api/waitlist/position?code=${encodeURIComponent(code)}`);
        const data = (await response.json()) as WaitlistPositionResponse & { error?: string };

        if (!response.ok || typeof data.position !== 'number') {
          throw new Error(data.error || 'Unable to load waitlist position');
        }

        if (cancelled) {
          return;
        }

        setPosition(data.position);
        setReferralCount(data.referralCount);
        setReferralLink(data.referralLink);
        void captureAnalyticsEvent('waitlist_verified', {
          position: data.position,
          referral_count: data.referralCount,
        });
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        const message =
          requestError instanceof Error ? requestError.message : 'Unable to load waitlist position';
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPosition();

    return () => {
      cancelled = true;
    };
  }, [code]);

  const copyToClipboard = async () => {
    if (!referralLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      void captureAnalyticsEvent('referral_link_copied');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Unable to copy your referral link.');
    }
  };

  const shareText = `I just joined the ${appName} waitlist.`;

  const shareOnX = () => {
    if (!referralLink) {
      return;
    }

    void captureAnalyticsEvent('referral_shared', { platform: 'twitter' });
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText,
    )}&url=${encodeURIComponent(referralLink)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
  };

  const shareOnLinkedIn = () => {
    if (!referralLink) {
      return;
    }

    void captureAnalyticsEvent('referral_shared', { platform: 'linkedin' });
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      referralLink,
    )}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <p className={styles.kicker}>{appName}</p>
        <h1 className={styles.title}>You&apos;re on the list</h1>

        {pageLoading && <p className={styles.subtitle}>Loading your waitlist position...</p>}

        {!pageLoading && pageError && <p className={styles.error}>{pageError}</p>}

        {!pageLoading && !pageError && position !== null && (
          <>
            <p className={styles.positionLine}>
              You&apos;re currently <span>#{position}</span>
            </p>
            <p className={styles.subtitle}>
              {referralCount > 0
                ? `${referralCount} verified ${referralCount === 1 ? 'referral' : 'referrals'} so far.`
                : 'Share your referral link to move up the waitlist.'}
            </p>
          </>
        )}

        {!pageLoading && referralLink && (
          <div className={styles.shareSection}>
            <div className={styles.linkRow}>
              <input
                className={styles.linkInput}
                value={referralLink}
                readOnly
                aria-label="Your referral link"
              />
              <button type="button" className={styles.copyButton} onClick={copyToClipboard}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className={styles.shareButtons}>
              <button type="button" className={styles.shareButton} onClick={shareOnX}>
                <Share2 size={16} />
                Share on X
              </button>
              <button type="button" className={styles.shareButton} onClick={shareOnLinkedIn}>
                <Share2 size={16} />
                Share on LinkedIn
              </button>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <Link href="/" className={styles.secondaryButton}>
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}

function LoadingFallback() {
  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <p className={styles.subtitle}>Loading...</p>
      </section>
    </main>
  );
}

export default function VerifiedPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifiedPageContent />
    </Suspense>
  );
}
