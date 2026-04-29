'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import UgcLogo from '@/components/ui/UgcLogo';
import Sidebar, { useSidebarState } from '@/components/ui/Sidebar';
import BottomNav from '@/components/ui/BottomNav';
import { ROUTES } from '@/lib/constants';
import { recordDailyLogin } from '@/services/ranking';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { collapsed, toggle } = useSidebarState();
  const dailyLoginRecorded = useRef(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(ROUTES.LOGIN);
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && !dailyLoginRecorded.current) {
      dailyLoginRecorded.current = true;
      recordDailyLogin();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-popline-pink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <BottomNav />

      <div className={`transition-[padding] duration-200 ${collapsed ? 'md:pl-16' : 'md:pl-60'}`}>
        <main className="pt-8 pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          {children}
        </main>

        <footer
          className={`hidden md:block fixed bottom-0 right-0 py-3 bg-background/80 backdrop-blur-xl border-t border-white/5 transition-[left] duration-200 ${collapsed ? 'md:left-16' : 'md:left-60'}`}
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-5xl mx-auto px-4 flex items-center justify-center">
            <a
              href="https://ugcplus.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-text-secondary/50 hover:text-text-secondary transition-colors"
            >
              <span className="text-[10px] tracking-wide">powered by</span>
              <UgcLogo size={16} />
              <span className="text-[10px] font-semibold tracking-wide">UGC+</span>
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
