import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Config via env to support any OpenAI-compatible server (e.g., vLLM, TGI, LM Studio, Ollama's OpenAI API).
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.MODEL || 'gpt-neox-20b';

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/generate', async (req, res) => {
  try {
    const { answers, tone = 'warm', length = 'medium', n = 3 } = req.body as {
      answers: Record<string, string> | Array<{ id: number; text: string }>;
      tone?: string;
      length?: 'short' | 'medium' | 'long';
      n?: number;
    };

    const answersText = Array.isArray(answers)
      ? answers.map(a => `Q${a.id}: ${a.text}`).join('\n')
      : Object.values(answers).join('\n');

    const lengthGuidance = length === 'short' ? 'around 120-180 words' : length === 'long' ? 'around 400-600 words' : 'around 220-300 words';

    const system = `You are an emotionally intelligent writing assistant that crafts heartfelt, authentic messages preserving the user's voice. Write with warmth and clarity.`;
    const user = `Using the reflections below, craft a single cohesive message. Tone emphasis: ${tone}. Target length: ${lengthGuidance}. Keep it sincere, grounded, and specific. Avoid clichés.
\n\nReflections:\n${answersText}`;

    const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(OPENAI_API_KEY ? { Authorization: `Bearer ${OPENAI_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: MODEL,
        n,
        temperature: 0.9,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(500).json({ error: 'Upstream error', detail: text });
    }

    const data = (await resp.json()) as any;
    const choices = data.choices || [];
    const results = choices.map((c: any) => c.message?.content || '').filter(Boolean);
    res.json({ versions: results });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Unknown error' });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on http://localhost:${PORT}`);
});
