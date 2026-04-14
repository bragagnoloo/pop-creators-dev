'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import Button from '@/components/ui/Button';
import { ROUTES } from '@/lib/constants';

const navItems = [
  { label: 'Dashboard', href: ROUTES.ADMIN },
  { label: 'Usuarios', href: ROUTES.ADMIN_USERS },
  { label: 'Campanhas', href: ROUTES.ADMIN_CAMPAIGNS },
  { label: 'Candidaturas', href: ROUTES.ADMIN_CANDIDATURAS },
  { label: 'Aulas', href: ROUTES.ADMIN_AULAS },
  { label: 'Saques', href: ROUTES.ADMIN_SAQUES },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push(ROUTES.LOGIN);
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-popline-pink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href={ROUTES.ADMIN} className="flex items-center gap-2">
                <span className="text-xl font-bold gradient-text">POPline</span>
                <span className="text-sm text-text-secondary">Admin</span>
              </Link>
              <nav className="hidden sm:flex items-center gap-1">
                {navItems.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      pathname === item.href
                        ? 'bg-surface text-text-primary font-medium'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await logout();
                router.push(ROUTES.HOME);
              }}
            >
              Sair
            </Button>
          </div>

          {/* Mobile nav */}
          <div className="sm:hidden flex gap-1 pb-3 overflow-x-auto">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  pathname === item.href
                    ? 'bg-surface text-text-primary font-medium'
                    : 'text-text-secondary'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
