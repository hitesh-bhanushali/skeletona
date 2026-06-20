// Skeletona Worker — serves the static landing page (via the ASSETS binding)
// and the waitlist API. Ported from the former Pages Functions in functions/api/.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/waitlist') {
      if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
      if (request.method === 'GET') return handleCount(env);
      if (request.method === 'POST') return handleSignup(request, env);
      return new Response('Method Not Allowed', { status: 405, headers: CORS });
    }

    if (url.pathname === '/api/export') {
      if (request.method === 'GET') return handleExport(url, env);
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Anything else is a static file — hand it to the assets binding.
    return env.ASSETS.fetch(request);
  },
};

async function handleCount(env) {
  const count = (await env.WAITLIST_KV.get('__count')) || '0';
  return Response.json({ count: parseInt(count) }, { headers: CORS });
}

async function handleSignup(request, env) {
  try {
    const { name, email, phone } = await request.json();

    if (!name || !name.trim()) {
      return Response.json({ ok: false, error: 'Name is required' }, { status: 400, headers: CORS });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ ok: false, error: 'Valid email is required' }, { status: 400, headers: CORS });
    }

    const key = `entry:${Date.now()}:${crypto.randomUUID()}`;
    await env.WAITLIST_KV.put(key, JSON.stringify({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || '').trim(),
      ts: Date.now(),
    }));

    const prev = parseInt((await env.WAITLIST_KV.get('__count')) || '0');
    const count = prev + 1;
    await env.WAITLIST_KV.put('__count', String(count));

    return Response.json({ ok: true, position: count }, { headers: CORS });
  } catch {
    return Response.json({ ok: false, error: 'Something went wrong' }, { status: 500, headers: CORS });
  }
}

async function handleExport(url, env) {
  const secret = url.searchParams.get('secret');

  if (!secret || secret !== env.EXPORT_SECRET) {
    return new Response('Forbidden', { status: 403 });
  }

  const { keys } = await env.WAITLIST_KV.list({ prefix: 'entry:' });

  const rows = await Promise.all(
    keys.map(async (k) => {
      const raw = await env.WAITLIST_KV.get(k.name);
      return raw ? JSON.parse(raw) : null;
    })
  );

  const valid = rows.filter(Boolean).sort((a, b) => a.ts - b.ts);

  const csv = [
    'name,email,phone,timestamp',
    ...valid.map(r =>
      `"${r.name.replace(/"/g, '""')}","${r.email}","${(r.phone || '').replace(/"/g, '""')}","${new Date(r.ts).toISOString()}"`
    ),
  ].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="skeletona-waitlist.csv"',
    },
  });
}
