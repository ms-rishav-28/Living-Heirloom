import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ANSWERS_KEY } from '@/lib/capsules';

interface Question {
  id: number;
  text: string;
  category: 'memories' | 'wisdom' | 'feelings' | 'future';
  followUp?: string;
}

const questions: Question[] = [
  {
    id: 1,
    text: "What's a moment from your life that still makes you smile when you think about it?",
    category: 'memories',
    followUp: 'Tell me more about why this moment was special to you.',
  },
  {
    id: 2,
    text: 'If you could share one piece of wisdom with someone you love, what would it be?',
    category: 'wisdom',
    followUp: 'What experiences taught you this wisdom?',
  },
  {
    id: 3,
    text: 'What do you hope the person receiving this letter will remember about you?',
    category: 'feelings',
    followUp: 'How do you want them to feel when they think of you?',
  },
  {
    id: 4,
    text: 'What dreams or hopes do you have for their future?',
    category: 'future',
    followUp: 'What advice would you give them to help achieve these dreams?',
  },
  {
    id: 5,
    text: "Is there something you've always wanted to tell them but never found the right moment?",
    category: 'feelings',
    followUp: 'What makes this the right moment to share it now?',
  },
];

const encouragements = [
  "Welcome. Let's begin, one question at a time.",
  'These memories are worth keeping.',
  'Your words will be treasured by whoever receives them.',
  'Almost there. The letter is taking shape.',
  'Last question. Answer it, and the drafting begins.',
];

const InterviewFlow = () => {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState('');

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Typewriter for the question — a courtesy, never a gate. Click to skip;
  // instant under reduced motion. The textarea stays usable throughout.
  useEffect(() => {
    if (!currentQuestion) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayedText(currentQuestion.text);
      setIsTyping(false);
      return;
    }
    setIsTyping(true);
    setDisplayedText('');
    let index = 0;
    const text = currentQuestion.text;
    const timer = setInterval(() => {
      index++;
      setDisplayedText(text.slice(0, index));
      if (index >= text.length) {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, 28);
    return () => clearInterval(timer);
  }, [currentQuestion]);

  const skipTyping = () => {
    setDisplayedText(currentQuestion.text);
    setIsTyping(false);
  };

  const handleNext = () => {
    if (!currentAnswer.trim()) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: currentAnswer }));

    if (currentQuestionIndex < questions.length - 1) {
      const next = questions[currentQuestionIndex + 1];
      setCurrentAnswer(answers[next.id] || '');
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      const all = { ...answers, [currentQuestion.id]: currentAnswer };
      try {
        localStorage.setItem(ANSWERS_KEY, JSON.stringify(all));
      } catch {
        // Storage unavailable (private mode); generation still works this session.
      }
      navigate('/generate');
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex === 0) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: currentAnswer }));
    const prevQuestion = questions[currentQuestionIndex - 1];
    setCurrentAnswer(answers[prevQuestion.id] || '');
    setCurrentQuestionIndex((prev) => prev - 1);
  };

  const handleSkip = () => {
    if (currentQuestionIndex < questions.length - 1) {
      // Keep whatever was typed so it's still there if they come back.
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: currentAnswer }));
      const next = questions[currentQuestionIndex + 1];
      setCurrentAnswer(answers[next.id] || '');
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen px-6 py-8">
      {/* Progress header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95">
        <div className="mx-auto max-w-3xl px-6 py-3.5">
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <Link to="/" className="font-display text-sm text-foreground">
              Living Heirloom
            </Link>
            <span className="font-sans text-xs text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" aria-label="Interview progress" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl pt-28">
        <div className="card-sacred mb-8">
          <p className="eyebrow mb-5 capitalize">{currentQuestion.category}</p>

          {/* Ghost copy reserves the final height so typing never shifts layout */}
          <h1
            className="text-display relative cursor-default text-2xl md:text-[1.75rem]"
            onClick={isTyping ? skipTyping : undefined}
            title={isTyping ? 'Click to show the full question' : undefined}
          >
            <span className="invisible" aria-hidden="true">
              {currentQuestion.text}
            </span>
            <span className="absolute inset-0" aria-hidden="true">
              <span className={isTyping ? 'caret' : ''}>{displayedText}</span>
            </span>
            <span className="sr-only">{currentQuestion.text}</span>
          </h1>

          {!isTyping && currentQuestion.followUp && (
            <p className="mt-3 italic text-muted-foreground">{currentQuestion.followUp}</p>
          )}

          <div className="mt-8 space-y-6">
            <Textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Take your time. Share what feels right to you."
              aria-label="Your answer"
              className="min-h-36 resize-none rounded border-input bg-card text-lg leading-relaxed focus:border-primary/50"
            />

            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div className="flex gap-3">
                {currentQuestionIndex > 0 && (
                  <Button variant="outline" onClick={handlePrevious} className="btn-gentle">
                    <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                    Previous
                  </Button>
                )}
                <Button variant="ghost" onClick={handleSkip} className="btn-ghost">
                  Skip for now
                </Button>
              </div>

              <Button onClick={handleNext} disabled={!currentAnswer.trim()} className="btn-hero group">
                {currentQuestionIndex === questions.length - 1 ? 'Draft my letter' : 'Continue'}
                <ArrowRight
                  className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center font-sans text-sm text-muted-foreground">
          {encouragements[currentQuestionIndex]}
        </p>
      </main>
    </div>
  );
};

export default InterviewFlow;
