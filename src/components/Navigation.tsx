import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const menuItems = [
  { label: 'How it works', href: '/#how' },
  { label: 'Your letters', href: '/capsules' },
];

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleAnchor = (href: string) => {
    setIsMenuOpen(false);
    if (!href.includes('#')) return;
    const id = href.split('#')[1];
    if (location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(`/#${id}`);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-3.5">
        <div className="flex items-center justify-between">
          {/* Wordmark */}
          <Link
            to="/"
            className="group inline-flex items-baseline gap-2.5"
            onClick={() => setIsMenuOpen(false)}
          >
            <span
              aria-hidden="true"
              className="self-center flex h-8 w-8 items-center justify-center rounded-full bg-primary font-display text-sm text-primary-foreground"
            >
              LH
            </span>
            <span className="font-display text-lg tracking-tight text-foreground">
              Living Heirloom
            </span>
          </Link>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-8">
            {menuItems.map((item) =>
              item.href.includes('#') ? (
                <button
                  key={item.label}
                  onClick={() => handleAnchor(item.href)}
                  className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.label}
                  to={item.href}
                  className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              )
            )}
            <Link to="/create" className="btn-hero !py-2.5 !px-5">
              Begin your letter
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded text-foreground"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div id="mobile-menu" className="md:hidden mt-3 border-t border-border pt-4 pb-3">
            <div className="flex flex-col gap-1">
              {menuItems.map((item) =>
                item.href.includes('#') ? (
                  <button
                    key={item.label}
                    onClick={() => handleAnchor(item.href)}
                    className="rounded px-2 py-2.5 text-left font-sans text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded px-2 py-2.5 font-sans text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                )
              )}
              <Link
                to="/create"
                onClick={() => setIsMenuOpen(false)}
                className="btn-hero mt-3 w-full"
              >
                Begin your letter
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
