import { NextRequest, NextResponse } from 'next/server';
import { parseRepository, scanRepository, ScanError } from '@/lib/scan';
import type { Scan } from '@/lib/types';
export const runtime = 'nodejs';
export const maxDuration = 30;
const cache = new Map<string, { scan: Scan; expires: number }>();
const inflight = new Map<string, Promise<Scan>>();
export async function POST(request: NextRequest) {
  if (Number(request.headers.get('content-length')) > 2048) return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
  try {
    const text = await request.text();
    if (text.length > 2048) throw new ScanError('Request too large.', 413);
    let body: unknown;
    try { body = JSON.parse(text); } catch { throw new ScanError('Send a JSON object with a repository field.'); }
    if (!body || typeof body !== 'object' || !('repository' in body) || typeof body.repository !== 'string') throw new ScanError('Enter a public GitHub repository.');
    const parsed = parseRepository(body.repository);
    const key = `${parsed.owner}/${parsed.name}`.toLowerCase();
    const saved = cache.get(key);
    if (saved && saved.expires > Date.now()) return NextResponse.json({ scan: saved.scan, cached: true });
    let job = inflight.get(key);
    if (!job) {
      if (inflight.size >= 10) throw new ScanError('The scanner is busy. Please try again in a moment.', 429);
      job = scanRepository(key);
      inflight.set(key, job);
    }
    const scan = await job.finally(() => inflight.delete(key));
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { scan, expires: Date.now() + 5 * 60 * 1000 });
    return NextResponse.json({ scan, cached: false });
  } catch (error) {
    if (error instanceof ScanError) return NextResponse.json({ error: error.message, retryAt: error.retryAt }, { status: error.status });
    return NextResponse.json({ error: 'This scan could not finish. Your saved workspace has not changed.' }, { status: 502 });
  }
}
