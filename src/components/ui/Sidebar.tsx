'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
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
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  Campanhas: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-8v18l-18-8z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  ),
  Aulas: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
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
      <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" />
      <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </svg>
  ),
  Ranking: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M17 4h3v3a3 3 0 0 1-3 3" />
      <path d="M7 4H4v3a3 3 0 0 0 3 3" />
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
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Collapse: ({ className }: IconProps) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
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

const STORAGE_KEY = 'popline_sidebar_collapsed';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    userService.getProfile(user.id).then(p => {
      setPhotoUrl(p?.photoUrl ?? null);
      setFullName(p?.fullName ?? '');
    });
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push(ROUTES.HOME);
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-40 bg-background/80 backdrop-blur-xl border-r border-border hidden md:flex flex-col transition-[width] duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Header / brand + collapse */}
      <div className="h-16 flex items-center justify-between px-3 border-b border-border">
        <Link
          href={ROUTES.DASHBOARD}
          className={`flex items-center gap-2 overflow-hidden ${collapsed ? 'w-0 opacity-0' : 'opacity-100'}`}
        >
          <span className="text-lg font-bold gradient-text whitespace-nowrap">POPline</span>
          <span className="text-xs text-text-secondary whitespace-nowrap">Creators</span>
        </Link>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={!collapsed}
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
        >
          <Icons.Collapse className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {menuItems.map(({ label, href, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 h-10 px-3 rounded-lg transition-colors ${
                active
                  ? 'bg-popline-pink/15 text-white'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span
                className={`text-sm font-medium whitespace-nowrap transition-opacity ${
                  collapsed ? 'opacity-0 w-0' : 'opacity-100'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: avatar + email + logout */}
      <div className="border-t border-border p-2">
        <div className={`flex items-center gap-3 p-2 ${collapsed ? 'justify-center' : ''}`}>
          <Avatar src={photoUrl} name={fullName || user?.email} size="sm" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-secondary truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sair' : undefined}
          className={`mt-1 w-full flex items-center gap-3 h-10 px-3 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Icons.Logout className="w-5 h-5 shrink-0" />
          <span
            className={`text-sm font-medium whitespace-nowrap transition-opacity ${
              collapsed ? 'opacity-0 w-0' : 'opacity-100'
            }`}
          >
            Sair
          </span>
        </button>
      </div>
    </aside>
  );
}

// Flag em módulo para override do useSyncExternalStore após toggle.
// useSyncExternalStore lê a cada render, então persistimos a última escolha aqui
// e notificamos subscribers manualmente. Evita setState-in-effect.
let overrideCollapsed: boolean | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): boolean {
  if (overrideCollapsed !== null) return overrideCollapsed;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === '1') return true;
  if (saved === '0') return false;
  // Default: collapsed em telas < 768px para não comer a viewport mobile.
  return window.matchMedia('(max-width: 767px)').matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useSidebarState() {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    const next = !collapsed;
    overrideCollapsed = next;
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    notify();
  };

  return { collapsed, toggle };
}
