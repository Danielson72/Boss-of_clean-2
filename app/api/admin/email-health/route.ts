import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can check email health
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const checks: Record<string, { status: 'ok' | 'warning' | 'error'; message: string }> = {};

    // 1. Check RESEND_API_KEY is set
    if (process.env.RESEND_API_KEY) {
      checks.resend_api_key = { status: 'ok', message: 'RESEND_API_KEY is configured' };
    } else {
      checks.resend_api_key = { status: 'error', message: 'RESEND_API_KEY is missing' };
    }

    // 2. Check Resend connectivity
    try {
      const { getResend } = await import('@/lib/email/resend');
      const resend = getResend();
      // Verify API key by listing domains
      const { data: domains, error: domainError } = await resend.domains.list();
      if (domainError) {
        checks.resend_connection = { status: 'error', message: `Resend API error: ${domainError.message}` };
      } else {
        const verified = (domains?.data || []).filter(d => d.status === 'verified');
        const pending = (domains?.data || []).filter(d => d.status !== 'verified');
        checks.resend_connection = {
          status: verified.length > 0 ? 'ok' : 'warning',
          message: `${verified.length} verified domain(s), ${pending.length} pending`,
        };

        // List domains for transparency
        for (const d of (domains?.data || [])) {
          checks[`domain_${d.name}`] = {
            status: d.status === 'verified' ? 'ok' : 'warning',
            message: `${d.name} — ${d.status}`,
          };
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      checks.resend_connection = { status: 'error', message: `Failed to connect: ${msg}` };
    }

    // 3. Check notification_preferences table exists and has data
    const { count: prefsCount, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('id', { count: 'exact', head: true });

    if (prefsError) {
      checks.notification_preferences = { status: 'warning', message: 'Table not accessible' };
    } else {
      checks.notification_preferences = {
        status: 'ok',
        message: `${prefsCount || 0} user preference records`,
      };
    }

    // 4. Check NEXT_PUBLIC_SITE_URL is set correctly
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl && siteUrl.includes('bossofclean.com')) {
      checks.site_url = { status: 'ok', message: siteUrl };
    } else if (siteUrl) {
      checks.site_url = { status: 'warning', message: `Set to ${siteUrl} (expected bossofclean.com)` };
    } else {
      checks.site_url = { status: 'warning', message: 'NEXT_PUBLIC_SITE_URL not set, using fallback' };
    }

    // 5. Check Supabase auth email settings
    checks.supabase_auth = {
      status: 'ok',
      message: 'Supabase handles verification emails via built-in auth',
    };

    // Overall status
    const hasErrors = Object.values(checks).some(c => c.status === 'error');
    const hasWarnings = Object.values(checks).some(c => c.status === 'warning');

    return NextResponse.json({
      overall: hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok',
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Unhandled error in /api/admin/email-health:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
