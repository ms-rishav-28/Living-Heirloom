import { useState } from 'react';

// The three voices are the real options offered on the generation page.
const VOICES = [
  {
    name: 'Heartfelt & Personal',
    note: 'Personal and intimate',
    sample:
      'I keep coming back to those Sunday mornings — your grandmother humming over the mixing bowl, flour on every surface, the radio turned low. Nobody was in a hurry. If I could hand you one thing from my life, it would be an hour inside that kitchen, so you would know exactly where you come from.',
  },
  {
    name: 'Wise & Reflective',
    note: 'Measured and clear-eyed',
    sample:
      'It took me years to understand why the Sunday kitchen stayed with me. It was never about the bread. It was the unhurried hour — proof that love, most of the time, looks like ordinary patience. Whatever life you build, leave room in it for an hour like that.',
  },
  {
    name: 'Poetic & Inspirational',
    note: 'Lyrical and unhurried',
    sample:
      'Some mornings are baked into a family. Flour in the air like first snow, a song under her breath, time moving slow as proofing dough. I am sending you that hour, sealed and still rising — open it whenever the world feels hurried.',
  },
];

const VoiceSampler = () => {
  const [active, setActive] = useState(0);

  return (
    <div>
      {/* Voice tabs */}
      <div
        role="tablist"
        aria-label="Letter voices"
        className="flex flex-wrap gap-2 mb-6"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          e.preventDefault();
          const next =
            e.key === 'ArrowRight'
              ? (active + 1) % VOICES.length
              : (active - 1 + VOICES.length) % VOICES.length;
          setActive(next);
          document.getElementById(`voice-tab-${next}`)?.focus();
        }}
      >
        {VOICES.map((voice, index) => (
          <button
            key={voice.name}
            role="tab"
            aria-selected={active === index}
            aria-controls={`voice-panel-${index}`}
            id={`voice-tab-${index}`}
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
            className={`rounded border px-4 py-2.5 text-left font-sans text-sm transition-colors ${
              active === index
                ? 'border-primary/60 bg-card text-foreground shadow-sm'
                : 'border-border bg-transparent text-muted-foreground hover:border-input hover:text-foreground'
            }`}
          >
            <span className="block font-medium">{voice.name}</span>
            <span className="block text-xs text-muted-foreground">{voice.note}</span>
          </button>
        ))}
      </div>

      {/* The drafted paragraph */}
      {VOICES.map((voice, index) => (
        <div
          key={voice.name}
          role="tabpanel"
          id={`voice-panel-${index}`}
          aria-labelledby={`voice-tab-${index}`}
          hidden={active !== index}
        >
          <blockquote className="card-preview">
            <p className="text-lg md:text-xl leading-relaxed max-w-[62ch] mb-0">{voice.sample}</p>
          </blockquote>
        </div>
      ))}

      <p className="mt-5 font-sans text-sm text-muted-foreground max-w-[60ch]">
        A worked example, drafted from the sample answer above. Your letter is written only from
        your own answers — slide the tone, set the length, and redraft until it sounds like you.
      </p>
    </div>
  );
};

export default VoiceSampler;
