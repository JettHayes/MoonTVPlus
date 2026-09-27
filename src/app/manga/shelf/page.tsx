'use client';

import { BookOpen, CircleMinus, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/cn';
import {
  deleteMangaShelf,
  getAllMangaShelf,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { MangaShelfItem } from '@/lib/manga.types';
import { processImageUrl } from '@/lib/utils';

import {
  mangaCardItem,
  mangaSavedDetailHref,
} from '@/components/media/adapters';
import EmptyState from '@/components/media/EmptyState';
import { LIBRARY_ACCENT_ICON, LIBRARY_MUTED } from '@/components/media/library';
import MediaGrid from '@/components/media/MediaGrid';
import MediaGridSkeleton from '@/components/media/MediaGridSkeleton';
import MediaPressCard from '@/components/media/MediaPressCard';

export default function MangaShelfPage() {
  const router = useRouter();
  const [shelf, setShelf] = useState<Record<string, MangaShelfItem>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToDataUpdates<Record<string, MangaShelfItem>>(
      'mangaShelfUpdated',
      setShelf
    );

    getAllMangaShelf()
      .then(setShelf)
      .catch(() => undefined)
      .finally(() => setLoading(false));

    return unsubscribe;
  }, []);

  const shelfList = useMemo(
    () => Object.entries(shelf).sort(([, a], [, b]) => b.saveTime - a.saveTime),
    [shelf]
  );

  const removeItem = async (sourceId: string, mangaId: string) => {
    const key = `${sourceId}+${mangaId}`;
    await deleteMangaShelf(sourceId, mangaId);
    setShelf((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <section className='space-y-4'>
      <div className={cn('flex items-center gap-2 text-sm', LIBRARY_MUTED)}>
        <BookOpen className={cn('h-4 w-4', LIBRARY_ACCENT_ICON)} />共{' '}
        {shelfList.length} 本漫画
        <span className='text-xs'>· 长按封面可移出书架</span>
      </div>

      {loading ? (
        <MediaGridSkeleton count={12} />
      ) : shelfList.length === 0 ? (
        <EmptyState
          icon={<BookOpen className='h-7 w-7' />}
          title='书架还是空的'
          description='在推荐或搜索页点封面右下角的书签，收藏的漫画会排到这里。'
        />
      ) : (
        <MediaGrid>
          {shelfList.map(([key, item]) => {
            const detailHref = mangaSavedDetailHref(item, '/manga/shelf');
            return (
              <MediaPressCard
                key={key}
                item={{
                  ...mangaCardItem(item),
                  count: item.unreadChapterCount,
                  subtitle:
                    item.unreadChapterCount && item.unreadChapterCount > 0
                      ? `更新至 ${item.latestChapterName || '最新章节'} · 新增 ${
                          item.unreadChapterCount
                        } 话`
                      : item.lastChapterName || item.author || item.status,
                }}
                href={detailHref}
                title={item.title}
                poster={processImageUrl(item.cover)}
                sourceName={item.sourceName}
                actions={[
                  {
                    id: 'detail',
                    label: '详情',
                    icon: <Info size={20} />,
                    onClick: () => router.push(detailHref),
                  },
                  {
                    id: 'remove-from-shelf',
                    label: '移出书架',
                    icon: <CircleMinus size={20} />,
                    onClick: () => void removeItem(item.sourceId, item.mangaId),
                    color: 'danger' as const,
                  },
                ]}
              />
            );
          })}
        </MediaGrid>
      )}
    </section>
  );
}
