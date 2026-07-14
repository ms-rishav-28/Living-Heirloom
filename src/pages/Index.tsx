import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Navigation from '@/components/Navigation';
import InterviewDemo from '@/components/landing/InterviewDemo';
import VoiceSampler from '@/components/landing/VoiceSampler';
import SealedLetter from '@/components/landing/SealedLetter';

const marginalia = [
  {
    label: 'The interview',
    note: 'Five gentle questions, answered at your own pace.',
  },
  {
    label: 'The drafts',
    note: 'Three letters in your voice. Slide the tone; set the length.',
  },
  {
    label: 'The seal',
    note: 'Kept for a birthday, an anniversary, or a day only you know is coming.',
  },
];

const occasions = [
  { when: 'For an eighteenth birthday', what: 'the letter she reads the morning she wakes up an adult' },
  { when: 'For an anniversary', what: 'twenty-five years, said the way you meant it the first time' },
  { when: 'For your future self', what: 'a reminder from the person who started all of this' },
];

const Index = () => {
  const location = useLocation();

  // Support /#how arriving from other routes.
  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen">
      <Navigation />

      <main>
        {/* ------------------------------------------------ Salutation */}
        <section className="px-6 pt-36 pb-24 md:pt-44 md:pb-32">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[15rem_1fr] lg:gap-16">
            {/* Marginalia rail */}
            <aside className="order-2 lg:order-1 lg:border-r lg:border-border lg:pr-8">
              <div className="grid gap-6 border-t border-border pt-8 sm:grid-cols-3 lg:grid-cols-1 lg:border-t-0 lg:pt-2">
                {marginalia.map((item) => (
                  <div key={item.label}>
                    <p className="eyebrow mb-1.5">{item.label}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.note}</p>
                  </div>
                ))}
              </div>
            </aside>

            {/* The salutation */}
            <div className="order-1 lg:order-2">
              <div className="animate-fade-up">
                <p className="eyebrow mb-6">For the words that should outlast the moment</p>
                <h1 className="text-hero max-w-[24ch]">
                  Some letters are too important to write alone.
                </h1>
              </div>

              <div className="animate-fade-up animate-stagger-1">
                <p className="text-emotion mt-7 max-w-[52ch]">
                  Living Heirloom interviews you, gently, then helps you shape what you meant to
                  say — a letter in your voice, sealed for the day it matters.
                </p>
              </div>

              <div className="animate-fade-up animate-stagger-2 mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link to="/create" className="btn-hero group">
                  Begin your letter
                  <ArrowRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
                <a href="#how" className="btn-gentle">
                  See how a letter takes shape
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ Part I — the interview */}
        <section id="how" className="scroll-mt-20 px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 max-w-[44rem] md:mb-16">
              <hr className="rule-gold mb-8 w-16" />
              <p className="eyebrow mb-4">Part I — The interview</p>
              <h2 className="text-display text-3xl md:text-4xl">First, it listens.</h2>
              <p className="text-emotion mt-4 max-w-[52ch]">
                No blank page. The interview asks about the moments, people, and hopes your letter
                is really about — one question at a time.
              </p>
            </div>
            <div className="mx-auto max-w-3xl">
              <InterviewDemo />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ Part II — the drafts */}
        {/* Tighter top: Parts I and II read as one movement; the ink band is the pause */}
        <section className="px-6 pb-24 pt-4 md:pb-32 md:pt-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 max-w-[44rem] md:mb-16">
              <hr className="rule-gold mb-8 w-16" />
              <p className="eyebrow mb-4">Part II — The drafts</p>
              <h2 className="text-display text-3xl md:text-4xl">Then it writes — three ways.</h2>
              <p className="text-emotion mt-4 max-w-[52ch]">
                From your answers alone, it drafts the same letter in three voices. Choose the one
                that sounds like you on your best day.
              </p>
            </div>
            <div className="mx-auto max-w-3xl">
              <VoiceSampler />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ Part III — the seal */}
        <section className="bg-[hsl(var(--ink-deep))] px-6 py-24 text-[hsl(var(--paper-on-ink))] md:py-32">
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <hr className="rule-gold mb-8 w-16" />
              <p className="eyebrow mb-4 !text-[hsl(var(--paper-on-ink))]/60">Part III — The seal</p>
              <h2 className="text-display text-3xl md:text-4xl">
                Write it today.
                <span className="block">Seal it for the day it's needed.</span>
              </h2>
              <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-[hsl(var(--paper-on-ink))]/70">
                Give your letter an opening date and it waits — quietly, patiently — until the
                moment it was written for.
              </p>

              <ul className="mt-10 max-w-[36rem]">
                {occasions.map((occasion) => (
                  <li
                    key={occasion.when}
                    className="border-t border-[hsl(var(--gold))]/30 py-4 first:border-t-0"
                  >
                    <p className="eyebrow !text-[hsl(var(--gold))]">{occasion.when}</p>
                    <p className="mt-1 italic text-[hsl(var(--paper-on-ink))]/80">
                      {occasion.what}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-center lg:justify-end lg:pr-8">
              <SealedLetter />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ Where your words live */}
        <section className="px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 max-w-[44rem]">
              <hr className="rule-gold mb-8 w-16" />
              <p className="eyebrow mb-4">A quiet promise</p>
              <h2 className="text-display text-3xl md:text-4xl">Where your words live</h2>
            </div>

            <div className="grid gap-10 md:grid-cols-3 md:gap-8">
              <div className="border-t border-border pt-6">
                <p className="eyebrow mb-3">Written with you, not for you</p>
                <p className="text-muted-foreground leading-relaxed">
                  Every draft is shaped only from your own answers — your stories, your phrasing,
                  your people. Nothing is invented on your behalf.
                </p>
              </div>
              <div className="border-t border-border pt-6">
                <p className="eyebrow mb-3">Your words stay with you</p>
                <p className="text-muted-foreground leading-relaxed">
                  The writing model runs on your own machine, and letters stay in your browser —
                  unless you choose delivery, when a letter is stored encrypted until the day it's
                  sent.
                </p>
              </div>
              <div className="border-t border-border pt-6">
                <p className="eyebrow mb-3">No account. No subscription.</p>
                <p className="text-muted-foreground leading-relaxed">
                  Open the app and write. The most valuable thing here is what you have to say —
                  and it stays yours.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ Postscript */}
        <section className="px-6 pb-28 pt-8 md:pb-36">
          <div className="mx-auto max-w-3xl">
            <div className="card-sacred">
              <p className="font-display text-xl text-muted-foreground" aria-hidden="true">
                P.S. —
              </p>
              <h2 className="text-display mt-3 text-3xl md:text-4xl">
                The right words, kept for the right day.
              </h2>
              <p className="text-emotion mt-4 max-w-[46ch]">
                It takes about fifteen unhurried minutes to answer the questions. The letter can
                wait as long as it needs to.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link to="/create" className="btn-hero group">
                  Begin your letter
                  <ArrowRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
                <p className="font-sans text-sm text-muted-foreground">
                  Five questions · Three drafts · Sealed until it's time
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------ Footer */}
      <footer className="px-6 pb-12">
        <div className="mx-auto max-w-6xl">
          <hr className="rule-gold-double mb-8" />
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="font-display text-lg">Living Heirloom</p>
              <p className="mt-1 text-sm italic text-muted-foreground">
                A writing companion for letters that wait.
              </p>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 font-sans text-sm">
              <a href="#how" className="text-muted-foreground transition-colors hover:text-foreground">
                How it works
              </a>
              <Link
                to="/create"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Begin your letter
              </Link>
              <Link
                to="/capsules"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Your letters
              </Link>
            </nav>
          </div>
          <p className="mt-8 font-sans text-xs text-muted-foreground">
            Runs on your machine · No account required · © 2026 Living Heirloom
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
