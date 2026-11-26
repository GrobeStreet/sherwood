import { getStore } from '@netlify/blobs';

// Private stats endpoint. Returns aggregate pageview counts as JSON.
// Protected by a secret key (STATS_KEY env var) so only the owner can read it.
export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!process.env.STATS_KEY || key !== process.env.STATS_KEY) {
    return new Response('Unauthorized', { status: 401, headers: { 'cache-control': 'no-store' } });
  }

  const store = getStore('sherwood-analytics');
  const { blobs } = await store.list();

  const byDay = {};
  const byPath = {};
  const byReferrer = {};

  for (const b of blobs) {
    const v = Number(await store.get(b.key)) || 0;
    if (b.key.startsWith('day:')) byDay[b.key.slice(4)] = v;
    else if (b.key.startsWith('path:')) byPath[b.key.slice(5)] = v;
    else if (b.key.startsWith('ref:')) byReferrer[b.key.slice(4)] = v;
  }

  // Total = sum of per-path counts, so the readout is always self-consistent.
  const total = Object.values(byPath).reduce((a, b) => a + b, 0);

  const sortDesc = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));

  const out = {
    total,
    by_day: byDay,
    by_path: sortDesc(byPath),
    by_referrer: sortDesc(byReferrer),
    generated: new Date().toISOString()
  };

  return new Response(JSON.stringify(out, null, 2), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
};
