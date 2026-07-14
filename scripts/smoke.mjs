// Smoke test for a running Living Heirloom server.
// Usage: node scripts/smoke.mjs   (BASE_URL env overrides http://localhost:3001)
// The server must have LH_ENCRYPTION_KEY set for the capsule steps to pass.

const BASE = process.env.BASE_URL ?? 'http://localhost:3001';
let failures = 0;

function report(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

function skip(name, why) {
  console.log(`SKIP  ${name} — ${why}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  // 1. Health
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  report('health', health?.ok === true);

  // 2. Capsule lifecycle
  const unlockAt = new Date(Date.now() + 1500).toISOString();
  const createResp = await fetch(`${BASE}/api/capsules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Smoke test letter',
      content: 'If you can read me after the unlock passes, storage and sealing work.',
      tone: 'warm',
      unlockAt,
      deliver: false,
    }),
  });

  if (createResp.status === 503) {
    skip('capsule lifecycle', 'LH_ENCRYPTION_KEY not configured on the server');
  } else {
    report('capsule create', createResp.status === 201, `status ${createResp.status}`);
    const { id, ownerToken, viewToken } = await createResp.json();

    const sealed = await fetch(`${BASE}/api/letters/${id}?k=${viewToken}`);
    report('letter sealed before unlock', sealed.status === 403, `status ${sealed.status}`);

    await sleep(2000);
    const open = await fetch(`${BASE}/api/letters/${id}?k=${viewToken}`);
    const openBody = open.ok ? await open.json() : null;
    report(
      'letter opens after unlock',
      open.status === 200 && openBody?.content?.includes('storage and sealing work'),
      `status ${open.status}`
    );

    const del = await fetch(`${BASE}/api/capsules/${id}`, {
      method: 'DELETE',
      headers: { 'X-Owner-Token': ownerToken },
    });
    report('capsule delete', del.status === 204, `status ${del.status}`);

    const gone = await fetch(`${BASE}/api/letters/${id}?k=${viewToken}`);
    report('letter gone after delete', gone.status === 404, `status ${gone.status}`);
  }

  // 3. Voice
  const voices = await fetch(`${BASE}/api/voice/voices`).then((r) => r.json());
  if (!voices?.provider || voices.provider === 'none') {
    skip('voice synthesize', 'no TTS provider configured');
  } else {
    report('voice provider', Array.isArray(voices.voices) && voices.voices.length > 0, voices.provider);
    const synth = await fetch(`${BASE}/api/voice/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Smoke test of the voice service.' }),
    });
    const bytes = synth.ok ? Buffer.from(await synth.arrayBuffer()) : Buffer.alloc(0);
    report(
      'voice synthesize',
      synth.status === 200 && bytes.length > 1000,
      `status ${synth.status}, ${bytes.length} bytes`
    );
  }

  // 4. SPA serving (only meaningful under npm run start)
  const page = await fetch(`${BASE}/capsules`);
  if (page.ok && (await page.text()).includes('<title>Living Heirloom')) {
    report('SPA fallback serves the app', true);
  } else {
    skip('SPA fallback', 'not in production static mode (expected under npm run dev)');
  }
} catch (err) {
  report('smoke run', false, err instanceof Error ? err.message : String(err));
}

console.log(failures === 0 ? '\nAll smoke checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
