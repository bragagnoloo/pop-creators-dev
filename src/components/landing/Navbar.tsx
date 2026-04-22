'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import UgcLogo from '@/components/ui/UgcLogo';
import { ROUTES } from '@/lib/constants';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { label: 'Como Funciona', href: '#como-funciona' },
    { label: 'Vantagens', href: '#vantagens' },
    { label: 'Parceiro', href: '#parceiro' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-background/70 backdrop-blur-2xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <span className="text-xl font-bold gradient-text">POPline</span>
            <span className="text-sm text-text-secondary font-medium">Creators</span>
            <span className="text-[10px] text-text-secondary/60 border border-border rounded-full px-2 py-0.5 hidden sm:block">
              powered by
            </span>
            <UgcLogo size={22} className="hidden sm:block" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {links.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link href={ROUTES.LOGIN}>
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link href={ROUTES.REGISTER}>
              <Button size="sm">Cadastrar</Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="md:hidden text-text-primary inline-flex items-center justify-center min-h-11 min-w-11 p-2 cursor-pointer rounded-lg hover:bg-white/5 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div id="mobile-menu" className="md:hidden pb-4 space-y-3 animate-slide-up">
            {links.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block text-sm text-text-secondary hover:text-text-primary transition-colors py-2"
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <Link href={ROUTES.LOGIN} className="flex-1">
                <Button variant="secondary" size="sm" className="w-full">Entrar</Button>
              </Link>
              <Link href={ROUTES.REGISTER} className="flex-1">
                <Button size="sm" className="w-full">Cadastrar</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
