import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import ListenButton from '@/components/ListenButton';
import { getLetter } from '@/lib/api';
import type { LetterResult } from '@/lib/api';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

// The recipient's view of a delivered letter: /letter/:id?k=<viewToken>.
// Three states — sealed (403), open (200), missing (404 / bad link).
const LetterView = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const viewToken = searchParams.get('k') ?? '';

  const [result, setResult] = useState<LetterResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    if (!id) {
      setResult({ status: 'missing' });
      return;
    }
    getLetter(id, viewToken)
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch(() => {
        if (!cancelled) setResult({ status: 'missing' });
      });
    return () => {
      cancelled = true;
    };
  }, [id, viewToken]);

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-8">
        <div className="card-sacred w-full max-w-2xl">
          <div className="space-y-4" aria-hidden="true">
            <div className="shimmer h-4 rounded" />
            <div className="shimmer h-4 w-5/6 rounded" />
            <div className="shimmer h-4 w-4/6 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (result.status === 'sealed') {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="card-sacred max-w-md text-center">
          <p className="eyebrow mb-4">A letter is waiting</p>
          <h1 className="text-display text-3xl">This letter opens on {formatDate(result.opensAt)}.</h1>
          <p className="text-emotion mt-3">It was written for that day. Come back when it arrives.</p>
        </div>
      </div>
    );
  }

  if (result.status === 'open') {
    return (
      <div className="min-h-screen px-6 py-16 md:py-24">
        <article className="mx-auto max-w-[65ch]">
          <hr className="rule-gold mb-8 w-16" />
          <h1 className="text-display text-3xl md:text-4xl">{result.title}</h1>
          <p className="mt-3 font-sans text-xs text-muted-foreground">
            Written {formatDate(result.writtenAt)}
          </p>
          <div className="mt-5">
            <ListenButton text={result.content} className="-ml-3" />
          </div>
          <p className="mt-8 whitespace-pre-line text-lg leading-[1.65]">{result.content}</p>
        </article>
      </div>
    );
  }

  // Missing — the NotFound composition, inline.
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="card-sacred max-w-md text-center">
        <p className="eyebrow mb-4">Page not found</p>
        <h1 className="text-display text-3xl">This page was never written.</h1>
        <p className="text-emotion mt-3">
          The address <span className="font-sans text-sm">{location.pathname}</span> doesn't lead
          anywhere.
        </p>
        <Link to="/" className="btn-hero mt-8 inline-flex">
          Return home
        </Link>
      </div>
    </div>
  );
};

export default LetterView;
