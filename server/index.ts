import 'dotenv/config';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { capsulesRouter } from './capsules';
import { warnIfEncryptionUnavailable } from './crypto';
import { startDeliveryScheduler } from './delivery/scheduler';
import { generateRouter } from './generate';
import { voiceRouter } from './voice/router';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use(generateRouter);
app.use(capsulesRouter);
app.use(voiceRouter);

// In production one Node process serves the whole product: the built frontend
// from dist/ with an SPA fallback for every non-API route.
if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
  if (existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    console.warn(`[server] NODE_ENV=production but ${distDir} does not exist — run \`npm run build\` first.`);
  }
}

warnIfEncryptionUnavailable();
startDeliveryScheduler();

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
