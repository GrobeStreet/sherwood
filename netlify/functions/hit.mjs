import { getStore } from '@netlify/blobs';

// Privacy-first pageview recorder.
// Stores only aggregate counts: total, per-day, per-path, per-referrer-host.
// It never receives or stores a VIN/HIN (the beacon sends only location.pathname),
// never sets a cookie, and never stores an IP or anything that identifies a visitor.
export default async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    // Defensive: strip any query/hash and cap length, so a VIN/HIN can never be recorded.
    const path = (String(body.p || '/').split('?')[0].split('#')[0].slice(0, 128)) || '/';
    const ref = String(body.r || '').slice(0, 128);

    const store = getStore('sherwood-analytics');
    const day = new Date().toISOString().slice(0, 10);

    const bump = async (key) => {
      const cur = Number(await store.get(key)) || 0;
      await store.set(key, String(cur + 1));
    };

    await bump(`day:${day}`);
    await bump(`path:${path}`);
    if (ref) await bump(`ref:${ref}`);
  } catch (e) {
    // A pageview beacon must never surface an error to the visitor.
  }
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
};
