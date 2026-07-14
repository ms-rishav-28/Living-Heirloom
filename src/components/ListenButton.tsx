import { useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getVoices, synthesize } from '@/lib/api';
import type { VoicesInfo } from '@/lib/api';

// The voice provider is queried once per session; every ListenButton shares
// the result. An unreachable endpoint is cached as "none" so the button
// stays hidden without re-probing.
let voicesPromise: Promise<VoicesInfo> | null = null;

function fetchVoicesOnce(): Promise<VoicesInfo> {
  if (!voicesPromise) {
    voicesPromise = getVoices().catch(() => ({ provider: 'none', voices: [] }));
  }
  return voicesPromise;
}

interface ListenButtonProps {
  /** The letter text to read aloud. */
  text: string;
  className?: string;
}

const ListenButton = ({ text, className }: ListenButtonProps) => {
  const [available, setAvailable] = useState(false);
  const [voiceId, setVoiceId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const audioTextRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchVoicesOnce().then((info) => {
      if (cancelled || info.provider === 'none') return;
      setAvailable(true);
      setVoiceId(info.voices[0]?.id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Stop playback and release the object URL when the button unmounts.
  useEffect(
    () => () => {
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  if (!available) return null;

  const handleClick = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      return;
    }

    // Replay the already-synthesized audio when the text hasn't changed.
    if (audioRef.current && audioTextRef.current === text) {
      try {
        await audioRef.current.play();
      } catch {
        toast("The voice service isn't available right now.");
      }
      return;
    }

    setIsLoading(true);
    try {
      const blob = await synthesize(text, voiceId);

      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('ended', () => setIsPlaying(false));

      urlRef.current = url;
      audioRef.current = audio;
      audioTextRef.current = text;

      await audio.play();
    } catch {
      toast("The voice service isn't available right now.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={handleClick}
      disabled={isLoading}
      className={`btn-ghost !py-2 !px-3 ${className ?? ''}`}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : isPlaying ? (
        <Pause className="mr-2 h-4 w-4" aria-hidden="true" />
      ) : (
        <Volume2 className="mr-2 h-4 w-4" aria-hidden="true" />
      )}
      {isPlaying ? 'Pause' : 'Listen'}
    </Button>
  );
};

export default ListenButton;
