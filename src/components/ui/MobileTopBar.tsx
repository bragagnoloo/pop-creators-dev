'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import * as userService from '@/services/users';
import { ROUTES } from '@/lib/constants';
import Avatar from './Avatar';

type IconProps = { className?: string };

const Icons = {
  Dashboard: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  Campanhas: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-8v18l-18-8z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  ),
  Aulas: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  ),
  Roteiros: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
      <path d="M5 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
      <path d="M19 14l.8 1.6L21.5 16l-1.7.4L19 18l-.8-1.6L16.5 16l1.7-.4z" />
    </svg>
  ),
  Carteira: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" /><path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </svg>
  ),
  Ranking: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M17 4h3v3a3 3 0 0 1-3 3" /><path d="M7 4H4v3a3 3 0 0 0 3 3" />
    </svg>
  ),
  Planos: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
    </svg>
  ),
  Logout: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Hamburger: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  Close: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

const menuItems = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: Icons.Dashboard, exact: true },
  { label: 'Campanhas', href: ROUTES.CAMPANHAS, icon: Icons.Campanhas },
  { label: 'Aulas', href: ROUTES.AULAS, icon: Icons.Aulas },
  { label: 'IA de Roteiros', href: ROUTES.ROTEIROS, icon: Icons.Roteiros },
  { label: 'Carteira', href: ROUTES.CARTEIRA, icon: Icons.Carteira },
  { label: 'Ranking', href: ROUTES.RANKING, icon: Icons.Ranking },
  { label: 'Planos', href: ROUTES.PLANOS, icon: Icons.Planos },
];

export default function MobileTopBar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    userService.getProfile(user.id).then(p => {
      setPhotoUrl(p?.photoUrl ?? null);
      setFullName(p?.fullName ?? '');
    });
  }, [user]);

  // Close drawer and avatar popover on navigation
  useEffect(() => {
    setDrawerOpen(false);
    setAvatarOpen(false);
  }, [pathname]);

  // Close avatar popover on outside click
  useEffect(() => {
    if (!avatarOpen) return;
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [avatarOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const handleLogout = async () => {
    await logout();
    router.push(ROUTES.HOME);
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Top bar */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-3 bg-background/80 backdrop-blur-xl border-b border-border"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menu"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
        >
          <Icons.Hamburger className="w-5 h-5" />
        </button>

        <Link href={ROUTES.DASHBOARD} className="absolute left-1/2 -translate-x-1/2">
          <span className="text-base font-bold gradient-text">POPline</span>
          <span className="text-xs text-text-secondary ml-1">Creators</span>
        </Link>

        <div ref={avatarRef} className="relative">
          <button
            type="button"
            onClick={() => setAvatarOpen(v => !v)}
            aria-label="Perfil e logout"
            aria-expanded={avatarOpen}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-popline-pink/50"
          >
            <Avatar src={photoUrl} name={fullName || user?.email} size="sm" />
          </button>

          {avatarOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs text-text-secondary truncate">{user?.email}</p>
                {fullName && <p className="text-sm font-medium text-white truncate">{fullName}</p>}
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
              >
                <Icons.Logout className="w-4 h-4 shrink-0" />
                Sair da conta
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 z-[70] w-72 bg-background border-r border-border flex flex-col transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-hidden={!drawerOpen}
      >
        {/* Drawer header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
          <span className="text-base font-bold gradient-text">POPline</span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Fechar menu"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
          >
            <Icons.Close className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {menuItems.map(({ label, href, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 h-11 px-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-popline-pink/15 text-white'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Drawer footer */}
        <div className="border-t border-border p-3 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <Avatar src={photoUrl} name={fullName || user?.email} size="sm" />
            <p className="text-xs text-text-secondary truncate flex-1">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 h-11 px-3 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
          >
            <Icons.Logout className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">Sair da conta</span>
          </button>
        </div>
      </div>
    </>
  );
}
