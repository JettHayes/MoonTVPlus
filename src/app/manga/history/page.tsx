'use client';

import { History } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/cn';
import {
  deleteMangaReadRecord,
  deleteMangaShelf,
  getAllMangaReadRecords,
  getAllMangaShelf,
  getCachedMangaReadRecordsSnapshot,
  saveMangaShelf,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { MangaReadRecord, MangaShelfItem } from '@/lib/manga.types';

import MangaHistoryCard from '@/components/manga/MangaHistoryCard';
import EmptyState from '@/components/media/EmptyState';
import { LIBRARY_ACCENT_ICON, LIBRARY_MUTED } from '@/components/media/library';
import MediaGrid from '@/components/media/MediaGrid';
import MediaGridSkeleton from '@/components/media/MediaGridSkeleton';

export default function MangaHistoryPage() {
  const [history, setHistory] = useState<Record<string, MangaReadRecord>>({});
  const [loading, setLoading] = useState(true);
  const [shelf, setShelf] = useState<Record<string, MangaShelfItem>>({});

  const updateHistory = (nextHistory: Record<string, MangaReadRecord>) => {
    setHistory(nextHistory);
  };

  useEffect(() => {
    const cachedHistory = getCachedMangaReadRecordsSnapshot();
    if (Object.keys(cachedHistory).length > 0) {
      updateHistory(cachedHistory);
      setLoading(false);
    }

    Promise.all([getAllMangaReadRecords(), getAllMangaShelf()])
      .then(([historyData, shelfData]) => {
        updateHistory(historyData);
        setShelf(shelfData);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));

    const unsubscribeHistory = subscribeToDataUpdates<
      Record<string, MangaReadRecord>
    >('mangaHistoryUpdated', updateHistory);
    const unsubscribeShelf = subscribeToDataUpdates<
      Record<string, MangaShelfItem>
    >('mangaShelfUpdated', setShelf);

    return () => {
      unsubscribeHistory();
      unsubscribeShelf();
    };
  }, []);

  const historyList = useMemo(
    () =>
      Object.entries(history).sort(([, a], [, b]) => b.saveTime - a.saveTime),
    [history]
  );

  const toggleShelf = async (item: MangaReadRecord) => {
    const key = `${item.sourceId}+${item.mangaId}`;
    if (shelf[key]) {
      await deleteMangaShelf(item.sourceId, item.mangaId);
      setShelf((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    const shelfItem: MangaShelfItem = {
      title: item.title,
      cover: item.cover,
      sourceId: item.sourceId,
      sourceName: item.sourceName,
      mangaId: item.mangaId,
      saveTime: Date.now(),
      lastChapterId: item.chapterId,
      lastChapterName: item.chapterName,
    };

    await saveMangaShelf(item.sourceId, item.mangaId, shelfItem);
    setShelf((prev) => ({ ...prev, [key]: shelfItem }));
  };

  const deleteHistory = async (item: MangaReadRecord) => {
    const key = `${item.sourceId}+${item.mangaId}`;
    await deleteMangaReadRecord(item.sourceId, item.mangaId);
    setHistory((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <section className='space-y-4'>
      <div className={cn('flex items-center gap-2 text-sm', LIBRARY_MUTED)}>
        <History className={cn('h-4 w-4', LIBRARY_ACCENT_ICON)} /> 共{' '}
        {historyList.length} 条阅读记录
      </div>

      {loading ? (
        <MediaGridSkeleton count={12} />
      ) : historyList.length === 0 ? (
        <EmptyState
          icon={<History className='h-7 w-7' />}
          title='还没有阅读记录'
          description='读过的漫画会按时间排在这里，长按卡片可以继续阅读或删除。'
        />
      ) : (
        <MediaGrid>
          {historyList.map(([key, item]) => (
            <MangaHistoryCard
              key={key}
              item={item}
              inShelf={!!shelf[`${item.sourceId}+${item.mangaId}`]}
              onToggleShelf={toggleShelf}
              onDelete={deleteHistory}
            />
          ))}
        </MediaGrid>
      )}
    </section>
  );
}
