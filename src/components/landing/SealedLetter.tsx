import { useEffect, useRef, useState } from 'react';

// A letter folding itself shut — pure CSS 3D, no assets, no libraries.
// Seals once when scrolled into view; renders pre-sealed under reduced motion.
const SealedLetter = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [sealed, setSealed] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSealed(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.55 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="seal-scene" role="img" aria-label="A letter sliding into an envelope, which closes and is stamped with a wax seal">
      <div className={`seal-letter ${sealed ? 'is-sealed' : ''}`}>
        <div className="env-back" />
        <div className="env-sheet" aria-hidden="true">
          <div className="env-line" />
          <div className="env-line" />
          <div className="env-line" />
          <div className="env-line" />
        </div>
        <div className="env-front" />
        <div className="env-flap" />
        <div className="env-seal" aria-hidden="true">
          LH
        </div>
      </div>
    </div>
  );
};

export default SealedLetter;
