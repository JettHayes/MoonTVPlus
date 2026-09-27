'use client';

import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  BookmarkCheck,
  BookmarkPlus,
  BookOpen,
  Clock3,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/cn';
import {
  deleteMangaShelf,
  getAllMangaReadRecords,
  getAllMangaShelf,
  saveMangaShelf,
} from '@/lib/db.client';
import {
  MangaChapter,
  MangaDetail,
  MangaReadRecord,
  MangaShelfItem,
} from '@/lib/manga.types';

import {
  mangaReadHref,
  mangaRecordReadHref,
} from '@/components/media/adapters';
import {
  BOOK_COVER_LIFT,
  BOOK_SPINE_OVERLAY,
  LIBRARY_BUTTON,
  LIBRARY_FOCUS,
  LIBRARY_GHOST_BUTTON,
  LIBRARY_MUTED,
  LIBRARY_PANEL,
  LIBRARY_ROW,
  LIBRARY_ROW_ACTIVE,
  LIBRARY_SERIF,
  LIBRARY_SKELETON,
  LIBRARY_TEXT,
} from '@/components/media/library';
import ProxyImage from '@/components/ProxyImage';

const PANEL_CLASS = cn(LIBRARY_PANEL, 'p-6');

/** 详情页里的元信息胶囊（作者 / 状态）。 */
const META_PILL =
  'rounded-sm bg-library-paper px-2.5 py-1 text-library-muted dark:bg-library-night dark:text-library-night-muted';

function MangaDetailSkeleton() {
  return (
    <div className='space-y-6'>
      <div className={cn('grid gap-6 md:grid-cols-[260px_1fr]', PANEL_CLASS)}>
        <div className={cn('aspect-[3/4]', LIBRARY_SKELETON)} />
        <div className='space-y-4'>
          <div className={cn('h-8 w-2/3', LIBRARY_SKELETON)} />
          <div className='flex gap-2'>
            <div className={cn('h-7 w-24 rounded-full', LIBRARY_SKELETON)} />
            <div className={cn('h-7 w-20 rounded-full', LIBRARY_SKELETON)} />
          </div>
          <div className='space-y-3'>
            <div className={cn('h-4 w-full', LIBRARY_SKELETON)} />
            <div className={cn('h-4 w-11/12', LIBRARY_SKELETON)} />
            <div className={cn('h-4 w-4/5', LIBRARY_SKELETON)} />
          </div>
          <div className='flex flex-wrap gap-3'>
            <div className={cn('h-11 w-32 rounded-md', LIBRARY_SKELETON)} />
            <div className={cn('h-11 w-40 rounded-md', LIBRARY_SKELETON)} />
            <div className={cn('h-11 w-32 rounded-md', LIBRARY_SKELETON)} />
          </div>
        </div>
      </div>
      <div className={PANEL_CLASS}>
        <div className={cn('mb-4 h-6 w-32', LIBRARY_SKELETON)} />
        <div className='space-y-2'>
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className={cn(LIBRARY_ROW, 'px-4 py-3')}>
              <div className={cn('h-4 w-1/3', LIBRARY_SKELETON)} />
              <div className={cn('mt-2 h-3 w-1/4', LIBRARY_SKELETON)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatChapterMeta(chapter: MangaChapter): string | null {
  if (typeof chapter.pageCount === 'number' && chapter.pageCount > 0) {
    return `${chapter.pageCount} 页`;
  }

  if (typeof chapter.uploadDate === 'number' && chapter.uploadDate > 0) {
    const timestamp =
      chapter.uploadDate > 1_000_000_000_000
        ? chapter.uploadDate
        : chapter.uploadDate * 1000;
    const date = new Date(timestamp);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('zh-CN');
    }
  }

  return null;
}

export default function MangaDetailPage() {
  const searchParams = useSearchParams();
  const mangaId = searchParams.get('mangaId') || '';
  const sourceId = searchParams.get('sourceId') || '';
  const returnTo = searchParams.get('returnTo') || '/manga';
  const [detail, setDetail] = useState<MangaDetail | null>(null);
  const [history, setHistory] = useState<Record<string, MangaReadRecord>>({});
  const [shelf, setShelf] = useState<Record<string, MangaShelfItem>>({});
  const [descOrder, setDescOrder] = useState(true);
  const clearedOnOpenRef = useRef<string | null>(null);

  const key = `${sourceId}+${mangaId}`;
  const currentRecord = history[key];

  useEffect(() => {
    if (!mangaId || !sourceId) return;

    const params = new URLSearchParams({
      mangaId,
      sourceId,
      title: searchParams.get('title') || '',
      cover: searchParams.get('cover') || '',
      sourceName: searchParams.get('sourceName') || '',
      description: searchParams.get('description') || '',
      author: searchParams.get('author') || '',
      status: searchParams.get('status') || '',
    });

    fetch(`/api/manga/detail?${params.toString()}`)
      .then((res) => res.json())
      .then(setDetail)
      .catch(() => undefined);

    getAllMangaReadRecords()
      .then(setHistory)
      .catch(() => undefined);
    getAllMangaShelf()
      .then(setShelf)
      .catch(() => undefined);
  }, [mangaId, searchParams, sourceId]);

  const chapters = useMemo(() => {
    const list = detail?.chapters || [];
    return [...list].sort((a, b) => {
      const diff = (a.chapterNumber || 0) - (b.chapterNumber || 0);
      return descOrder ? -diff : diff;
    });
  }, [detail?.chapters, descOrder]);

  const chronologicalChapters = useMemo(() => {
    const list = detail?.chapters || [];
    return [...list].sort((a, b) => {
      const diff = (a.chapterNumber || 0) - (b.chapterNumber || 0);
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });
  }, [detail?.chapters]);

  const latestChapter = chronologicalChapters[chronologicalChapters.length - 1];
  const unreadChapterCount = shelf[key]?.unreadChapterCount || 0;
  const newChapterIds = useMemo(() => {
    if (unreadChapterCount <= 0) return new Set<string>();
    return new Set(
      chronologicalChapters
        .slice(-unreadChapterCount)
        .map((chapter) => chapter.id)
    );
  }, [chronologicalChapters, unreadChapterCount]);

  useEffect(() => {
    const shelfItem = shelf[key];
    if (
      !detail ||
      !shelfItem ||
      !latestChapter ||
      (shelfItem.unreadChapterCount || 0) <= 0
    ) {
      return;
    }

    if (clearedOnOpenRef.current === key) {
      return;
    }
    clearedOnOpenRef.current = key;

    const nextItem: MangaShelfItem = {
      ...shelfItem,
      latestChapterId: latestChapter.id,
      latestChapterName: latestChapter.name,
      latestChapterCount: chronologicalChapters.length,
      unreadChapterCount: 0,
    };

    // 只后台清零，当前页保留进入时看到的更新提示，刷新后再消失。
    saveMangaShelf(sourceId, mangaId, nextItem).catch(() => undefined);
  }, [
    chronologicalChapters.length,
    detail,
    key,
    latestChapter,
    mangaId,
    shelf,
    sourceId,
  ]);

  const toggleShelf = async () => {
    if (!detail) return;
    if (shelf[key]) {
      await deleteMangaShelf(sourceId, mangaId);
      setShelf((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    const item: MangaShelfItem = {
      title: detail.title,
      cover: detail.cover,
      sourceId: detail.sourceId,
      sourceName: detail.sourceName,
      mangaId: detail.id,
      saveTime: Date.now(),
      description: detail.description,
      author: detail.author,
      status: detail.status,
      lastChapterId: currentRecord?.chapterId,
      lastChapterName: currentRecord?.chapterName,
      latestChapterId: latestChapter?.id,
      latestChapterName: latestChapter?.name,
      latestChapterCount: chronologicalChapters.length,
      unreadChapterCount: 0,
    };
    await saveMangaShelf(sourceId, mangaId, item);
    setShelf((prev) => ({ ...prev, [key]: item }));
  };

  const chapterHref = (chapter: MangaChapter) =>
    mangaReadHref(
      {
        mangaId,
        sourceId,
        chapterId: chapter.id,
        title: detail?.title || '',
        cover: detail?.cover || '',
        sourceName: detail?.sourceName || '',
        chapterName: chapter.name,
      },
      returnTo
    );

  if (!detail) return <MangaDetailSkeleton />;

  return (
    <div className='space-y-6'>
      <div className={cn('grid gap-6 md:grid-cols-[260px_1fr]', PANEL_CLASS)}>
        {/* 封面立起来：外层投影 + 覆盖层书脊，和书墙上的卡片同一套。 */}
        <div
          className={cn(
            'relative aspect-[3/4] overflow-hidden rounded-md bg-library-ochre-tint dark:bg-library-night-ochre-tint',
            BOOK_COVER_LIFT
          )}
        >
          {detail.cover ? (
            <>
              <ProxyImage
                originalSrc={detail.cover}
                alt={detail.title}
                className='h-full w-full object-cover'
              />
              <span className={BOOK_SPINE_OVERLAY} aria-hidden />
            </>
          ) : (
            <div
              className={cn(
                'flex h-full flex-col items-center justify-center gap-2 text-sm',
                LIBRARY_MUTED
              )}
            >
              <BookOpen className='h-8 w-8' />
              暂无封面
            </div>
          )}
        </div>
        <div className='space-y-4'>
          <div>
            <h1
              className={cn(
                'text-2xl font-semibold sm:text-3xl',
                LIBRARY_TEXT,
                LIBRARY_SERIF
              )}
            >
              {detail.title}
            </h1>
            <div
              className={cn('mt-3 flex flex-wrap gap-2 text-xs', LIBRARY_MUTED)}
            >
              <span className='rounded-sm bg-library-ochre-tint px-2.5 py-1 text-library-ochre dark:bg-library-night-ochre-tint dark:text-library-night-ochre'>
                {detail.sourceName}
              </span>
              {detail.author && (
                <span className={META_PILL}>{detail.author}</span>
              )}
              {detail.status && (
                <span className={META_PILL}>{detail.status}</span>
              )}
            </div>
          </div>
          {detail.description && (
            <p className='text-sm leading-7 text-library-ink/80 dark:text-library-night-ink/80'>
              {detail.description}
            </p>
          )}
          <div className='flex flex-wrap gap-3'>
            {chapters[0] && (
              <Link href={chapterHref(chapters[0])} className={LIBRARY_BUTTON}>
                <BookOpen className='h-4 w-4' />
                开始阅读
              </Link>
            )}
            {currentRecord && (
              <Link
                href={mangaRecordReadHref(currentRecord, returnTo)}
                className={LIBRARY_GHOST_BUTTON}
              >
                <Clock3 className='h-4 w-4' />
                继续阅读 第 {currentRecord.pageIndex + 1}/
                {currentRecord.pageCount} 页
              </Link>
            )}
            <button
              type='button'
              onClick={toggleShelf}
              aria-pressed={Boolean(shelf[key])}
              className={cn(
                LIBRARY_FOCUS,
                'inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors duration-200',
                shelf[key]
                  ? 'border-transparent bg-library-ochre-tint text-library-ochre hover:bg-library-ochre-tint/70 dark:bg-library-night-ochre-tint dark:text-library-night-ochre dark:hover:bg-library-night-ochre-tint/70'
                  : 'border-library-edge text-library-ink hover:border-library-ochre hover:text-library-ochre dark:border-library-night-edge dark:text-library-night-ink dark:hover:border-library-night-ochre dark:hover:text-library-night-ochre'
              )}
            >
              {shelf[key] ? (
                <BookmarkCheck className='h-4 w-4' />
              ) : (
                <BookmarkPlus className='h-4 w-4' />
              )}
              {shelf[key] ? '移出书架' : '加入书架'}
            </button>
          </div>
        </div>
      </div>

      <div className={PANEL_CLASS}>
        <div className='mb-4 flex items-center justify-between gap-3'>
          <h2
            className={cn('text-lg font-semibold', LIBRARY_TEXT, LIBRARY_SERIF)}
          >
            章节列表
          </h2>
          <button
            type='button'
            onClick={() => setDescOrder((prev) => !prev)}
            aria-pressed={descOrder}
            className={cn(LIBRARY_GHOST_BUTTON, 'gap-1.5 px-3 py-2 text-xs')}
          >
            {descOrder ? (
              <ArrowDownWideNarrow className='h-4 w-4' />
            ) : (
              <ArrowUpWideNarrow className='h-4 w-4' />
            )}
            {descOrder ? '倒序' : '正序'}
          </button>
        </div>
        {unreadChapterCount > 0 && latestChapter && (
          <div className='mb-4 rounded-md border border-library-ochre/30 bg-library-ochre-tint px-4 py-3 text-sm text-library-ochre dark:border-library-night-ochre/30 dark:bg-library-night-ochre-tint dark:text-library-night-ochre'>
            已更新 {unreadChapterCount} 话，最新章节：{latestChapter.name}
          </div>
        )}
        <div className='grid gap-2'>
          {chapters.map((chapter) => {
            const active = currentRecord?.chapterId === chapter.id;
            const isNewChapter = newChapterIds.has(chapter.id);
            const meta = formatChapterMeta(chapter);
            const progress =
              active && currentRecord
                ? `上次看到第 ${currentRecord.pageIndex + 1} 页`
                : null;

            return (
              <Link
                key={chapter.id}
                href={chapterHref(chapter)}
                className={cn(
                  'rounded-md border px-4 py-3 text-sm transition-colors duration-200',
                  LIBRARY_FOCUS,
                  active
                    ? LIBRARY_ROW_ACTIVE
                    : cn(
                        LIBRARY_ROW,
                        'hover:border-library-ochre dark:hover:border-library-night-ochre'
                      )
                )}
              >
                <div className='flex items-center justify-between gap-3'>
                  <div className={cn('font-medium', LIBRARY_TEXT)}>
                    {chapter.name}
                  </div>
                  {isNewChapter && (
                    <span className='shrink-0 rounded-sm bg-library-ochre px-1.5 py-0.5 text-[11px] font-medium text-library-chip'>
                      更新
                    </span>
                  )}
                </div>
                <div className={cn('mt-1 text-xs', LIBRARY_MUTED)}>
                  {[meta, progress].filter(Boolean).join(' · ')}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
