import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// The actual first question from the interview flow — the demo shows the
// real product, not a paraphrase.
const QUESTION =
  "What's a moment from your life that still makes you smile when you think about it?";

const SAMPLE_ANSWER =
  'Sunday mornings — your grandmother humming in the kitchen while the radio played, flour on everything, and nobody in a hurry.';

const InterviewDemo = () => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Begin typing when the demo scrolls into view, once.
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setDisplayed(QUESTION);
      setDone(true);
      setStarted(true);
      return;
    }
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started || done) return;
    let index = 0;
    const timer = setInterval(() => {
      index++;
      setDisplayed(QUESTION.slice(0, index));
      if (index >= QUESTION.length) {
        setDone(true);
        clearInterval(timer);
      }
    }, 28);
    return () => clearInterval(timer);
  }, [started, done]);

  const skip = () => {
    setDisplayed(QUESTION);
    setDone(true);
  };

  return (
    <div ref={sectionRef}>
      {/* A sheet from the interview, reproduced faithfully */}
      <div
        className="card-sacred cursor-default"
        onClick={done ? undefined : skip}
        aria-label={done ? undefined : 'Skip the typing animation'}
      >
        <p className="eyebrow mb-6">Question 1 of 5</p>
        {/* Ghost copy reserves the final height so typing never shifts layout */}
        <p className="text-display relative text-2xl md:text-[1.75rem]">
          <span className="invisible" aria-hidden="true">
            {QUESTION}
          </span>
          <span className="absolute inset-0" aria-hidden="true">
            <span className={done ? '' : 'caret'}>{displayed}</span>
          </span>
          <span className="sr-only">{QUESTION}</span>
        </p>

        <div
          className={`mt-6 border-t border-border pt-6 transition-opacity duration-500 ${
            done ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={!done}
        >
          <p className="eyebrow mb-3">A sample answer</p>
          <p className="italic text-lg leading-relaxed text-muted-foreground max-w-[58ch]">
            “{SAMPLE_ANSWER}”
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4">
        <p className="text-sm text-muted-foreground font-sans">
          Five questions. Skip any of them. Take all the time you need.
        </p>
        <Link to="/create" className="link-ink font-sans text-sm inline-flex items-center gap-1.5">
          Answer it for real
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};

export default InterviewDemo;
