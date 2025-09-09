import { useState } from 'react';
import { Menu, X, Clock, Heart, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { label: 'Create Capsule', href: '/create', icon: Clock, external: true },
    { label: 'My Capsules', href: '/capsules', icon: Heart, external: true },
    { label: 'How It Works', href: '#how-it-works', icon: User, external: false },
  ];

  const handleNavClick = (href: string, external: boolean) => {
    if (external) {
      window.location.href = href;
    } else {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-serif font-medium">Living Heirloom</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.href, item.external)}
                className="text-muted-foreground hover:text-foreground transition-colors story-link cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Button className="btn-hero" onClick={() => window.location.href = '/create'}>
              Start Creating
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4">
            <div className="space-y-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      handleNavClick(item.href, item.external);
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <Button 
                className="w-full btn-hero mt-4" 
                onClick={() => {
                  window.location.href = '/create';
                  setIsMenuOpen(false);
                }}
              >
                Start Creating
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;