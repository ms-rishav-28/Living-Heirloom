import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Lock, Copy, Download, Eye, Trash2, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ListenButton from '@/components/ListenButton';
import { deleteServerCapsule } from '@/lib/api';
import { Capsule, deleteCapsule, isSealed, loadCapsules } from '@/lib/capsules';

type Filter = 'all' | 'sealed' | 'open';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

const CapsuleLibrary = () => {
  const [capsules, setCapsules] = useState<Capsule[]>(() => loadCapsules());
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [viewing, setViewing] = useState<Capsule | null>(null);
  const [deleting, setDeleting] = useState<Capsule | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return capsules.filter((c) => {
      const matchesSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.recipient.toLowerCase().includes(q) ||
        c.content.toLowerCase().includes(q);
      const sealed = isSealed(c);
      const matchesFilter =
        filter === 'all' || (filter === 'sealed' && sealed) || (filter === 'open' && !sealed);
      return matchesSearch && matchesFilter;
    });
  }, [capsules, searchQuery, filter]);

  const handleCopy = async (capsule: Capsule) => {
    try {
      await navigator.clipboard.writeText(capsule.content);
      toast('Letter copied to your clipboard.');
    } catch {
      toast('Could not reach the clipboard — open the letter and copy it directly.');
    }
  };

  const handleDownload = (capsule: Capsule) => {
    const blob = new Blob([`${capsule.title}\n${formatDate(capsule.createdAt)}\n\n${capsule.content}\n`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${capsule.title.replace(/[^\w\s-]/g, '').trim() || 'letter'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    if (deleting.serverId && deleting.ownerToken) {
      // Best-effort: cancel the server-side delivery copy too. The local
      // delete proceeds whether or not the server is reachable.
      deleteServerCapsule(deleting.serverId, deleting.ownerToken).catch(() => {});
    }
    deleteCapsule(deleting.id);
    setCapsules(loadCapsules());
    setDeleting(null);
    toast('The letter was deleted.');
  };

  const sealProgress = (capsule: Capsule) => {
    if (!capsule.unlockAt) return 0;
    const start = new Date(capsule.createdAt).getTime();
    const end = new Date(capsule.unlockAt).getTime();
    if (end <= start) return 100;
    return Math.min(100, Math.max(0, Math.round(((Date.now() - start) / (end - start)) * 100)));
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-32">
        {/* Header */}
        <div className="mb-10">
          <hr className="rule-gold mb-8 w-16" />
          <h1 className="text-display text-3xl md:text-4xl">Your letters</h1>
          <p className="text-emotion mt-2">
            Kept in this browser, sealed or open, until you decide otherwise.
          </p>
        </div>

        {/* Controls */}
        {capsules.length > 0 && (
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Search your letters…"
                aria-label="Search your letters"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2" role="group" aria-label="Filter letters">
              {(['all', 'sealed', 'open'] as const).map((f) => (
                <button
                  key={f}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-3.5 py-1.5 font-sans text-xs font-medium capitalize transition-colors ${
                    filter === f
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-secondary text-secondary-foreground hover:border-input'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <Link to="/create" className="btn-hero !py-2.5 !px-5">
              <PenLine className="mr-2 h-4 w-4" aria-hidden="true" />
              New letter
            </Link>
          </div>
        )}

        {/* Letters */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((capsule) => {
            const sealed = isSealed(capsule);
            return (
              <article key={capsule.id} className="card-memory flex flex-col">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h2 className="text-display text-lg leading-snug">{capsule.title}</h2>
                  {sealed && (
                    <Badge className="shrink-0 bg-primary/10 font-sans text-primary hover:bg-primary/10">
                      <Lock className="mr-1 h-3 w-3" aria-hidden="true" />
                      Sealed
                    </Badge>
                  )}
                </div>

                <div className="mb-4 font-sans text-xs text-muted-foreground">
                  <p>
                    Written {formatDate(capsule.createdAt)}
                    {capsule.unlockAt && <> · opens {formatDate(capsule.unlockAt)}</>}
                  </p>
                  {capsule.deliverTo && capsule.unlockAt && (
                    <p className="mt-1">Delivery requested · {formatDate(capsule.unlockAt)}</p>
                  )}
                </div>

                <p className="mb-5 line-clamp-3 leading-relaxed text-muted-foreground">
                  {capsule.content}
                </p>

                {sealed && capsule.unlockAt && (
                  <div className="mb-5" aria-hidden="true">
                    <div className="h-1 w-full rounded-full bg-muted">
                      <div
                        className="h-1 rounded-full bg-primary/70"
                        style={{ width: `${sealProgress(capsule)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-auto flex items-center gap-1 border-t border-border pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="btn-ghost !px-3 !py-2"
                    onClick={() => setViewing(capsule)}
                  >
                    <Eye className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Read
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="btn-ghost !px-3 !py-2"
                    onClick={() => handleCopy(capsule)}
                  >
                    <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="btn-ghost !px-3 !py-2"
                    onClick={() => handleDownload(capsule)}
                  >
                    <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="btn-ghost ml-auto !px-3 !py-2 hover:!text-destructive"
                    onClick={() => setDeleting(capsule)}
                    aria-label={`Delete "${capsule.title}"`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Empty states */}
        {capsules.length === 0 && (
          <div className="card-sacred mx-auto max-w-xl text-center">
            <p className="eyebrow mb-4">Nothing here yet</p>
            <h2 className="text-display text-2xl">Your first letter is unwritten.</h2>
            <p className="text-emotion mx-auto mt-3 max-w-[40ch]">
              Answer five questions and keep the result here — open, or sealed until a day that
              matters.
            </p>
            <Link to="/create" className="btn-hero mt-8 inline-flex">
              Begin your letter
            </Link>
          </div>
        )}

        {capsules.length > 0 && filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-emotion">No letters match that search.</p>
          </div>
        )}
      </main>

      {/* Read dialog */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="text-display pr-6 text-2xl font-medium">
                  {viewing.title}
                </DialogTitle>
                <DialogDescription className="font-sans text-xs">
                  Written {formatDate(viewing.createdAt)}
                  {viewing.unlockAt && <> · opens {formatDate(viewing.unlockAt)}</>}
                </DialogDescription>
              </DialogHeader>
              <ListenButton text={viewing.content} className="justify-self-start !-ml-3" />
              <p className="whitespace-pre-line pt-2 text-lg leading-relaxed">{viewing.content}</p>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this letter?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” will be removed from this browser. There is no way to get it
              back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CapsuleLibrary;
