'use client';

import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { ShinyButton } from './ShinyButton';
import { WavyBackground } from './WavyBackground';
import styles from './WaitlistHero.module.css';

type WaitlistHeroProps = {
  referralCode?: string | null;
};

const features = [
  ['Double opt-in', 'Every signup confirms by email before they count.'],
  ['Referral links', 'Verified users get a share link and referral credit.'],
  ['You own the data', 'Supabase stores the waitlist in your project.'],
];

const waveColors = ['#25f2b8', '#f6c466', '#4ea7ff', '#ffffff'];

export default function WaitlistHero({ referralCode = null }: WaitlistHeroProps) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [formRenderedAt, setFormRenderedAt] = useState(() => Date.now());
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!emailRegex.test(email)) {
      setError('Please enter a valid email');
      return;
    }

    setError('');
    setSuccessMessage('');
    setSubmitted(false);
    setLoading(true);

    void captureAnalyticsEvent('waitlist_submit', {
      has_referral: Boolean(referralCode),
    });

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          referredBy: referralCode,
          website,
          submittedAt: formRenderedAt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data?.error || 'Something went wrong';
        setError(message);
        void captureAnalyticsEvent('waitlist_submit_error', { error: message });
        setLoading(false);
        return;
      }

      void captureAnalyticsEvent('waitlist_submit_success');
      setSuccessMessage(data?.message || 'Check your email to verify your spot on the waitlist.');
      setSubmitted(true);
      setLoading(false);
      setFormRenderedAt(Date.now());
    } catch {
      setError('Network error. Please try again.');
      void captureAnalyticsEvent('waitlist_submit_error', { error: 'network_error' });
      setLoading(false);
      setFormRenderedAt(Date.now());
    }
  };

  return (
    <section id="hero" className={`section-sheen ${styles.heroSection}`}>
      <WavyBackground
        blur={5}
        speed="slow"
        waveOpacity={0.08}
        waveWidth={44}
        colors={waveColors}
      />
      <div className={`container ${styles.heroContainer}`}>
        <div className={styles.topBar}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>OW</span>
            Open Waitlist
          </div>
          <div className={styles.repoTag}>Next.js + Supabase + Resend</div>
        </div>

        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 42 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className={styles.kicker}>
            <span className={styles.kickerDot} />
            Open-source verified waitlist
          </p>

          <h1 className={styles.title}>
            Launch with a list you <span>own.</span>
          </h1>

          <p className={styles.subtitle}>
            Collect early users, verify every signup, and give supporters a referral link without
            renting your launch list from a third-party waitlist tool.
          </p>

          <div className={styles.ctaGroup}>
            <form
              id="waitlist-form"
              className={`${styles.emailForm} ${error ? styles.emailFormError : ''}`}
              onSubmit={handleSubmit}
            >
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className={styles.honeypotInput}
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                className={styles.emailInput}
                value={email}
                required
                disabled={loading || submitted}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError('');
                  if (submitted) {
                    setSubmitted(false);
                    setSuccessMessage('');
                  }
                }}
              />
              <ShinyButton className={styles.ctaPrimary} type="submit" disabled={loading || submitted}>
                {loading ? 'Submitting...' : submitted ? 'Check your inbox' : 'Join waitlist'}
              </ShinyButton>
            </form>
            {error && <p className={styles.emailError}>{error}</p>}
            {submitted && (
              <p className={styles.emailSuccess}>
                {successMessage || 'Check your email to verify your spot on the waitlist.'}
              </p>
            )}
          </div>

          <div className={styles.featureRail}>
            {features.map(([title, description]) => (
              <div key={title} className={styles.featureItem}>
                <strong>{title}</strong>
                <span>{description}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
