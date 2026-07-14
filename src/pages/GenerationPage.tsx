import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ListenButton from '@/components/ListenButton';
import { createCapsule } from '@/lib/api';
import { loadAnswers, newCapsuleId, saveCapsule } from '@/lib/capsules';
import type { Capsule } from '@/lib/capsules';

type Tone = 'gentle' | 'warm' | 'thoughtful' | 'inspiring';
type Length = 'short' | 'medium' | 'long';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

const voiceTitles = [
  { title: 'Heartfelt & Personal', note: 'Personal and intimate' },
  { title: 'Wise & Reflective', note: 'Measured and clear-eyed' },
  { title: 'Poetic & Inspirational', note: 'Lyrical and unhurried' },
];

const GenerationPage = () => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(true);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [versions, setVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState(0);
  const [toneAdjustment, setToneAdjustment] = useState([5]);
  const [tone, setTone] = useState<Tone>('warm');
  const [lengthPreference, setLengthPreference] = useState<Length>('medium');

  // Seal & save
  const [recipient, setRecipient] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [unlockAt, setUnlockAt] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // A filled email without an opening date can't be delivered — surface the
  // hint inline and hold the seal until a date is chosen.
  const emailNeedsDate = recipientEmail.trim().length > 0 && !unlockAt;

  const currentVersion = versions[selectedVersion] || '';

  const generate = useCallback(
    async (opts: { tone: Tone; length: Length }) => {
      const answers = loadAnswers();
      if (!answers || Object.keys(answers).length === 0) {
        navigate('/create');
        return;
      }
      setIsGenerating(true);
      setGenerationError(null);
      try {
        const resp = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers, tone: opts.tone, length: opts.length, n: 3 }),
        });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        const v: string[] = data?.versions || [];
        if (!v.length) throw new Error('The model returned no drafts.');
        setVersions(v);
        setSelectedVersion(0);
      } catch (e) {
        // A dead proxy target yields a 500 with an empty body — never let the
        // error state collapse to a falsy string.
        const message = e instanceof Error ? e.message : '';
        setGenerationError(message || 'The local writing service is unreachable.');
      } finally {
        setIsGenerating(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    generate({ tone: 'warm', length: 'medium' });
  }, [generate]);

  const handleRegenerate = () => generate({ tone, length: lengthPreference });

  const handleCopy = async () => {
    if (!currentVersion) return;
    try {
      await navigator.clipboard.writeText(currentVersion);
      toast('Letter copied to your clipboard.');
    } catch {
      toast('Could not reach the clipboard — select the text and copy it directly.');
    }
  };

  const handleSave = async () => {
    if (!currentVersion || isSaving) return;
    const trimmedRecipient = recipient.trim();
    const email = recipientEmail.trim();

    if (email && !unlockAt) {
      // The inline hint is already showing — bring the date field into reach.
      document.getElementById('unlock-date')?.focus();
      return;
    }

    if (email) {
      const emailInput = document.getElementById('recipient-email');
      if (emailInput instanceof HTMLInputElement && !emailInput.checkValidity()) {
        emailInput.reportValidity();
        return;
      }
    }

    const unlockIso = unlockAt ? new Date(`${unlockAt}T00:00:00`).toISOString() : undefined;
    const capsule: Capsule = {
      id: newCapsuleId(),
      title: trimmedRecipient ? `A letter for ${trimmedRecipient}` : 'A letter, unaddressed',
      recipient: trimmedRecipient,
      content: currentVersion,
      tone,
      createdAt: new Date().toISOString(),
      unlockAt: unlockIso,
    };

    if (email && unlockIso) {
      setIsSaving(true);
      try {
        const created = await createCapsule({
          title: capsule.title,
          recipientName: trimmedRecipient || undefined,
          recipientEmail: email,
          content: currentVersion,
          tone,
          unlockAt: unlockIso,
          deliver: true,
        });
        capsule.serverId = created.id;
        capsule.ownerToken = created.ownerToken;
        capsule.deliverTo = email;
        saveCapsule(capsule);
        toast(`Sealed. It will be delivered on ${formatDate(unlockIso)}.`);
      } catch {
        // 503 = delivery unconfigured; any other failure (server down, …)
        // gets the same local-only fallback so the letter is never lost.
        saveCapsule(capsule);
        toast("This server isn't set up for delivery yet — your letter is saved here instead.");
      } finally {
        setIsSaving(false);
      }
      navigate('/capsules');
      return;
    }

    saveCapsule(capsule);
    toast(unlockAt ? 'Your letter is sealed and saved.' : 'Your letter is saved.');
    navigate('/capsules');
  };

  if (isGenerating) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-8">
        <div className="card-sacred w-full max-w-2xl">
          <p className="eyebrow mb-5">Drafting</p>
          <h1 className="text-display text-2xl md:text-3xl">Writing from your answers…</h1>
          <p className="text-emotion mt-3 mb-8">
            Three drafts, in three voices — shaped only from what you shared.
          </p>
          <div className="space-y-4" aria-hidden="true">
            <div className="shimmer h-4 rounded" />
            <div className="shimmer h-4 w-5/6 rounded" />
            <div className="shimmer h-4 w-4/6 rounded" />
            <div className="shimmer h-4 w-5/6 rounded" />
          </div>
          <p className="mt-10 font-sans text-sm text-muted-foreground" role="status">
            This runs on your own machine and may take a moment.
          </p>
        </div>
      </div>
    );
  }

  if (generationError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-8">
        <div className="card-sacred w-full max-w-2xl">
          <p className="eyebrow mb-5">The drafting model isn't reachable</p>
          <h1 className="text-display text-2xl md:text-3xl">Your answers are safe — the writer is offline.</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Living Heirloom drafts with a model running on your machine. Start the local server and
            model, then try again:
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 font-sans text-sm text-muted-foreground">
            <li>
              Run <code className="rounded bg-muted px-1.5 py-0.5">npm run dev:all</code> so the
              API server is up.
            </li>
            <li>
              Make sure an OpenAI-compatible model server (Ollama, LM Studio, vLLM…) is running —
              see the README for configuration.
            </li>
          </ol>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleRegenerate} className="btn-hero">
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
            <Button variant="outline" onClick={() => navigate('/create')} className="btn-gentle">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to the interview
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link to="/" className="font-display text-sm text-foreground">
              Living Heirloom
            </Link>
            <Button variant="outline" onClick={() => navigate('/create')} className="btn-gentle !py-2 !px-4">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to the interview
            </Button>
          </div>
          <Button variant="outline" onClick={handleRegenerate} className="btn-gentle !py-2 !px-4">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Draft again
          </Button>
        </div>

        <div className="grid gap-10 lg:grid-cols-3">
          {/* Drafts */}
          <div className="lg:col-span-2">
            <p className="eyebrow mb-4">Choose your voice</p>
            <div
              className="mb-6 grid gap-3 md:grid-cols-3"
              role="tablist"
              aria-label="Letter voices"
              onKeyDown={(e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                e.preventDefault();
                const count = voiceTitles.length;
                const next =
                  e.key === 'ArrowRight'
                    ? (selectedVersion + 1) % count
                    : (selectedVersion - 1 + count) % count;
                if (versions[next]) {
                  setSelectedVersion(next);
                  document.getElementById(`gen-voice-tab-${next}`)?.focus();
                }
              }}
            >
              {voiceTitles.map((info, index) => (
                <button
                  key={info.title}
                  id={`gen-voice-tab-${index}`}
                  role="tab"
                  aria-selected={selectedVersion === index}
                  tabIndex={selectedVersion === index ? 0 : -1}
                  onClick={() => setSelectedVersion(index)}
                  disabled={!versions[index]}
                  className={`rounded border p-4 text-left font-sans transition-colors disabled:opacity-40 ${
                    selectedVersion === index
                      ? 'border-primary/60 bg-card shadow-sm'
                      : 'border-border hover:border-input'
                  }`}
                >
                  <span className="block text-sm font-medium">{info.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{info.note}</span>
                </button>
              ))}
            </div>

            <div className="card-preview">
              <p className="whitespace-pre-line text-lg font-normal leading-relaxed">
                {currentVersion}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="font-sans text-xs text-muted-foreground">
                {currentVersion.split(' ').filter(Boolean).length} words · ~
                {Math.max(1, Math.ceil(currentVersion.split(' ').filter(Boolean).length / 200))} min
                read · <span className="capitalize">{tone}</span>
              </p>
              <div className="flex items-center gap-1">
                <ListenButton text={currentVersion} />
                <Button variant="ghost" onClick={handleCopy} className="btn-ghost !py-2 !px-3">
                  <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                  Copy letter
                </Button>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <div className="card-memory">
              <p className="eyebrow mb-6">Adjust the writing</p>

              <div className="space-y-8">
                <div>
                  <Label htmlFor="tone-slider" className="mb-3 block font-sans text-sm font-medium">
                    Emotional register
                  </Label>
                  <Slider
                    id="tone-slider"
                    value={toneAdjustment}
                    onValueChange={(v) => {
                      setToneAdjustment(v);
                      const level = v[0];
                      if (level <= 3) setTone('gentle');
                      else if (level <= 6) setTone('warm');
                      else if (level <= 8) setTone('thoughtful');
                      else setTone('inspiring');
                    }}
                    max={10}
                    min={1}
                    step={1}
                    aria-label="Emotional register, from gentle to inspiring"
                  />
                  <div className="mt-2 flex justify-between font-sans text-xs text-muted-foreground">
                    <span>Gentle</span>
                    <span className="capitalize font-medium text-foreground">{tone}</span>
                    <span>Inspiring</span>
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block font-sans text-sm font-medium">Length</Label>
                  <Select value={lengthPreference} onValueChange={(v) => setLengthPreference(v as Length)}>
                    <SelectTrigger aria-label="Letter length">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short — a note</SelectItem>
                      <SelectItem value="medium">Medium — a letter</SelectItem>
                      <SelectItem value="long">Long — several pages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" className="btn-gentle w-full" onClick={handleRegenerate}>
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Draft again with these settings
                </Button>
              </div>
            </div>

            <div className="card-memory">
              <p className="eyebrow mb-6">Seal &amp; keep</p>

              <div className="space-y-5">
                <div>
                  <Label htmlFor="recipient" className="mb-2 block font-sans text-sm font-medium">
                    Who is it for? <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="recipient"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Emma, my future self, …"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="recipient-email"
                    className="mb-2 block font-sans text-sm font-medium"
                  >
                    Recipient's email <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="recipient-email"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="emma@example.com"
                  />
                  {emailNeedsDate && (
                    <p className="mt-2 font-sans text-xs text-muted-foreground">
                      Add an opening date to have it delivered.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="unlock-date" className="mb-2 block font-sans text-sm font-medium">
                    Sealed until <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="unlock-date"
                    type="date"
                    value={unlockAt}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setUnlockAt(e.target.value)}
                  />
                  <p className="mt-2 font-sans text-xs text-muted-foreground">
                    The letter is kept in your browser and marked sealed until this date.
                  </p>
                </div>

                <Button className="btn-hero w-full" onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                  {unlockAt ? 'Seal & save the letter' : 'Save the letter'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerationPage;
