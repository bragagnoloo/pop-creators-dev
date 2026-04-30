'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { pixelPageView } from '@/lib/pixel';

export default function MetaPixelPageView() {
  const pathname = usePathname();
  useEffect(() => {
    pixelPageView();
  }, [pathname]);
  return null;
}
