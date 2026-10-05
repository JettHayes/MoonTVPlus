import { Suspense } from 'react';

import { SearchPageClient } from '@/components/SearchPageClient';

// App Router 只允许 page.tsx 导出默认页面组件，所以把 SearchPageClient
// 抽到 components/，由 /search 与 /under 共同复用。
export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageClient />
    </Suspense>
  );
}
