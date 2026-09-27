'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function RouteScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined' || !pathname) return;
    // 漫画与小说的浏览页共用一套外壳，进入新页面时都要回到顶部；阅读页自己管滚动。
    const isBrowsePage =
      (pathname.startsWith('/manga') || pathname.startsWith('/books')) &&
      pathname !== '/manga/read' &&
      pathname !== '/books/read';
    if (!isBrowsePage) return;

    const reset = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    reset();
    const rafId = window.requestAnimationFrame(reset);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [pathname]);

  return null;
}
