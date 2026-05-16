import { vi } from 'vitest';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
process.env.SUPABASE_SECRET_KEY = 'test-secret-key';
process.env.RESEND_API_KEY = 're_test_key';
process.env.WAITLIST_FROM_EMAIL = 'Test <test@example.com>';
process.env.NEXT_PUBLIC_SITE_URL = 'https://test.example.com';
process.env.WAITLIST_BOT_PROTECTION_ENABLED = 'false';
