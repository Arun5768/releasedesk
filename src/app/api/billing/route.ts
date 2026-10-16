import { NextRequest, NextResponse } from 'next/server';
export function GET(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get('plan');
  const link = plan === 'pro' ? process.env.STRIPE_PRO_PAYMENT_LINK : plan === 'studio' ? process.env.STRIPE_STUDIO_PAYMENT_LINK : undefined;
  if (link) {
    try {
      const url = new URL(link);
      if (url.protocol === 'https:' && url.hostname === 'buy.stripe.com' && !url.username && !url.password) return NextResponse.redirect(url, 303);
    } catch { /* An invalid configuration must never become an open redirect. */ }
  }
  return NextResponse.redirect(new URL('/pricing?billing=unavailable', request.url), 303);
}
