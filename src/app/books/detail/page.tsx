'use client';

import { BookmarkPlus, BookOpen, Download, FileText, Tags } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  deleteBookShelf,
  getAllBookShelf,
  saveBookShelf,
} from '@/lib/book.db.client';
import { BookChapter, BookDetail, BookShelfItem } from '@/lib/book.types';
import {
  buildBookReadPath,
  cacheBookDetail,
  getBookRouteCache,
} from '@/lib/book-route-cache.client';
import { cn } from '@/lib/cn';

import EmptyState from '@/components/media/EmptyState';
import {
  BOOK_COVER_LIFT,
  BOOK_SPINE_OVERLAY,
  LIBRARY_BUTTON,
  LIBRARY_FOCUS,
  LIBRARY_GHOST_BUTTON,
  LIBRARY_MUTED,
  LIBRARY_PANEL,
  LIBRARY_ROW,
  LIBRARY_SERIF,
  LIBRARY_SKELETON,
  LIBRARY_TEXT,
} from '@/components/media/library';
import ProxyImage from '@/components/ProxyImage';

const PANEL_CLASS = cn(LIBRARY_PANEL, 'p-5');
const ROW_CLASS = cn(LIBRARY_ROW, 'px-4 py-3');
const SOLID_BUTTON_CLASS = cn(LIBRARY_BUTTON, 'cursor-pointer px-5 py-2.5');
const GHOST_BUTTON_CLASS = cn(
  LIBRARY_GHOST_BUTTON,
  'cursor-pointer px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-60'
);

const CHAPTER_PREVIEW_LIMIT = 60;

function DetailSkeleton() {
  return (
    <div className='animate-pulse space-y-6'>
      <section
        className={cn('grid gap-6 md:grid-cols-[220px_1fr]', PANEL_CLASS)}
      >
        <div className={cn('aspect-[3/4]', LIBRARY_SKELETON)} />
        <div className='space-y-4'>
          <div className={cn('h-8 w-2/3', LIBRARY_SKELETON)} />
          <div className={cn('h-4 w-1/3', LIBRARY_SKELETON)} />
          <div className='space-y-2'>
            <div className={cn('h-4 w-full', LIBRARY_SKELETON)} />
            <div className={cn('h-4 w-11/12', LIBRARY_SKELETON)} />
            <div className={cn('h-4 w-10/12', LIBRARY_SKELETON)} />
          </div>
          <div className='flex gap-3'>
            <div className={cn('h-10 w-24', LIBRARY_SKELETON)} />
            <div className={cn('h-10 w-24', LIBRARY_SKELETON)} />
          </div>
        </div>
      </section>
    </div>
  );
}

function parseDownloadFilename(disposition: string | null) {
  if (!disposition) return '';
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return '';
    }
  }
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || '';
}

function sanitizeFilename(name: string) {
  return name.replace(/[/:*?"<>|]/g, '_').trim();
}

async function openBookFile(
  sourceId: string,
  bookId: string,
  format?: 'epub' | 'pdf' | 'chapters',
  download = false,
  href?: string,
  title?: string
) {
  const response = await fetch('/api/books/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceId,
      bookId,
      format: format || null,
      href: href || undefined,
    }),
  });
  if (!response.ok) {
    let message = '打开文件失败';
    try {
      const json = await response.json();
      message = json.error || message;
    } catch {
      // Keep fallback error message.
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  if (download) {
    const headerFilename = parseDownloadFilename(
      response.headers.get('content-disposition')
    );
    const fallbackBaseName =
      sanitizeFilename(title || bookId || 'book') || 'book';
    const extension = format === 'pdf' ? 'pdf' : 'epub';
    const finalFilename = headerFilename || `${fallbackBaseName}.${extension}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function BookDetailPage() {
  const searchParams = useSearchParams();
  const sourceId = searchParams.get('sourceId') || '';
  const bookId = searchParams.get('bookId') || '';
  const [detail, setDetail] = useState<BookDetail | null>(null);
  const [shelf, setShelf] = useState<Record<string, BookShelfItem>>({});
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chaptersError, setChaptersError] = useState('');
  const [error, setError] = useState('');
  const [fileBusy, setFileBusy] = useState<'open' | 'download' | ''>('');
  const [showAllChapters, setShowAllChapters] = useState(false);

  const cached = useMemo(
    () => (sourceId && bookId ? getBookRouteCache(sourceId, bookId) : null),
    [sourceId, bookId]
  );

  useEffect(() => {
    getAllBookShelf()
      .then((items) => {
        setShelf(items);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!sourceId || !bookId) return;
    fetch('/api/books/detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId,
        bookId,
        href: cached?.detailHref,
        title: cached?.title,
        author: cached?.author,
        cover: cached?.cover,
        summary: cached?.summary,
        acquisitionLinks: cached?.acquisitionLinks || [],
      }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '获取详情失败');
        setDetail(json);
        cacheBookDetail(json);
      })
      .catch((err) => setError(err.message || '获取详情失败'));
  }, [sourceId, bookId, cached]);

  const readable = detail?.acquisitionLinks.find((item) => {
    const type = item.type.toLowerCase();
    return (
      type.includes('epub') ||
      type.includes('pdf') ||
      type.includes('legado-chapters') ||
      item.rel === 'legado:chapters'
    );
  });
  const readableFormat = readable?.type.toLowerCase().includes('pdf')
    ? 'pdf'
    : readable?.type.toLowerCase().includes('legado-chapters') ||
      readable?.rel === 'legado:chapters'
    ? 'chapters'
    : 'epub';

  useEffect(() => {
    if (!detail || !readable || readableFormat !== 'chapters') {
      setChapters([]);
      setChaptersError('');
      setChaptersLoading(false);
      return;
    }
    let cancelled = false;
    setChapters([]);
    setChaptersLoading(true);
    setChaptersError('');
    const params = new URLSearchParams({
      sourceId: detail.sourceId,
      bookId: detail.id,
    });
    fetch(`/api/books/read/chapters?${params.toString()}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '获取章节失败');
        if (cancelled) return;
        setChapters((json.chapters || []) as BookChapter[]);
      })
      .catch((err) => {
        if (cancelled) return;
        setChapters([]);
        setChaptersError(err.message || '获取章节失败');
      })
      .finally(() => {
        if (!cancelled) setChaptersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detail, readable, readableFormat]);

  const toggleShelf = async () => {
    if (!detail) return;
    const bookKey = `${detail.sourceId}+${detail.id}`;
    if (shelf[bookKey]) {
      await deleteBookShelf(detail.sourceId, detail.id);
      setShelf((prev) => {
        const next = { ...prev };
        delete next[bookKey];
        return next;
      });
      return;
    }
    const item: BookShelfItem = {
      sourceId: detail.sourceId,
      sourceName: detail.sourceName,
      bookId: detail.id,
      title: detail.title,
      author: detail.author,
      cover: detail.cover,
      format: readableFormat,
      detailHref: detail.detailHref,
      acquisitionHref: readable?.href,
      saveTime: Date.now(),
    };
    await saveBookShelf(detail.sourceId, detail.id, item);
    setShelf((prev) => ({ ...prev, [bookKey]: item }));
    cacheBookDetail(detail);
  };

  if (error) return <EmptyState tone='error' description={error} />;
  if (!detail) return <DetailSkeleton />;

  const visibleChapters = showAllChapters
    ? chapters
    : chapters.slice(0, CHAPTER_PREVIEW_LIMIT);

  return (
    <div className='space-y-6'>
      <section
        className={cn('grid gap-6 md:grid-cols-[220px_1fr]', PANEL_CLASS)}
      >
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
        <div className='flex min-w-0 flex-col justify-between gap-5'>
          <div>
            <span className='inline-flex items-center gap-1.5 rounded-sm bg-library-ochre-tint px-2.5 py-1 text-xs font-medium text-library-ochre dark:bg-library-night-ochre-tint dark:text-library-night-ochre'>
              <BookOpen className='h-3.5 w-3.5' />
              {detail.sourceName}
            </span>
            <h1
              className={cn(
                'mt-4 text-2xl font-semibold sm:text-3xl',
                LIBRARY_TEXT,
                LIBRARY_SERIF
              )}
            >
              {detail.title}
            </h1>
            <div className={cn('mt-2 text-sm', LIBRARY_MUTED)}>
              {detail.author || '未知作者'}
            </div>
            {detail.summary ? (
              <div className='mt-4 line-clamp-5 text-sm leading-7 text-library-ink/80 dark:text-library-night-ink/80'>
                {detail.summary}
              </div>
            ) : null}
            <div className='mt-4 flex flex-wrap gap-2'>
              {(detail.categories || detail.tags || []).map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium',
                    'bg-library-paper text-library-muted dark:bg-library-night dark:text-library-night-muted'
                  )}
                >
                  <Tags className='h-3 w-3' />
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className='flex flex-wrap gap-3'>
            {readable ? (
              <Link
                href={buildBookReadPath(detail.sourceId, detail.id)}
                onClick={() => cacheBookDetail(detail)}
                className={SOLID_BUTTON_CLASS}
              >
                <BookOpen className='h-4 w-4' />
                在线阅读
              </Link>
            ) : null}
            <button
              type='button'
              onClick={toggleShelf}
              aria-pressed={Boolean(shelf[`${detail.sourceId}+${detail.id}`])}
              className={cn(
                GHOST_BUTTON_CLASS,
                shelf[`${detail.sourceId}+${detail.id}`] &&
                  'border-transparent bg-library-ochre-tint text-library-ochre hover:border-transparent hover:text-library-ochre dark:bg-library-night-ochre-tint dark:text-library-night-ochre dark:hover:text-library-night-ochre'
              )}
            >
              <BookmarkPlus className='h-4 w-4' />
              {shelf[`${detail.sourceId}+${detail.id}`]
                ? '移出书架'
                : '加入书架'}
            </button>
            {readable && readableFormat !== 'chapters' ? (
              <button
                type='button'
                onClick={async () => {
                  try {
                    setFileBusy('download');
                    await openBookFile(
                      detail.sourceId,
                      detail.id,
                      readableFormat,
                      true,
                      readable?.href,
                      detail.title
                    );
                  } catch (err) {
                    setError((err as Error).message || '下载文件失败');
                  } finally {
                    setFileBusy('');
                  }
                }}
                disabled={fileBusy !== ''}
                className={GHOST_BUTTON_CLASS}
              >
                <Download className='h-4 w-4' />
                {fileBusy === 'download' ? '下载中...' : '下载文件'}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className={PANEL_CLASS}>
        <div className='flex items-center gap-2'>
          <FileText className='h-5 w-5 text-library-ochre dark:text-library-night-ochre' />{' '}
          <h2
            className={cn('text-lg font-semibold', LIBRARY_TEXT, LIBRARY_SERIF)}
          >
            可用格式
          </h2>
        </div>
        <div className='mt-4 space-y-2'>
          {detail.acquisitionLinks.map((item) => {
            const type = item.type.toLowerCase();
            const format = type.includes('pdf')
              ? 'pdf'
              : type.includes('epub')
              ? 'epub'
              : type.includes('legado-chapters') ||
                item.rel === 'legado:chapters'
              ? 'chapters'
              : undefined;
            return (
              <div
                key={`${item.href}-${item.type}`}
                className={cn(
                  'flex items-center justify-between gap-4 text-sm',
                  ROW_CLASS
                )}
              >
                <div className='min-w-0'>
                  <div className={cn('truncate font-medium', LIBRARY_TEXT)}>
                    {item.title || item.type}
                  </div>
                  <div className={cn('mt-1 truncate text-xs', LIBRARY_MUTED)}>
                    {item.rel}
                  </div>
                </div>
                <button
                  type='button'
                  disabled={!format || fileBusy !== ''}
                  onClick={async () => {
                    if (!format) return;
                    if (format === 'epub' || format === 'chapters') {
                      cacheBookDetail(detail);
                      window.location.href = buildBookReadPath(
                        detail.sourceId,
                        detail.id
                      );
                      return;
                    }
                    try {
                      setFileBusy('open');
                      await openBookFile(
                        detail.sourceId,
                        detail.id,
                        format,
                        false,
                        item.href
                      );
                    } catch (err) {
                      setError((err as Error).message || '打开文件失败');
                    } finally {
                      setFileBusy('');
                    }
                  }}
                  className={cn(
                    'shrink-0 cursor-pointer rounded-sm px-3 py-1.5 text-xs font-medium text-library-ochre transition-colors duration-200 hover:bg-library-ochre-tint disabled:cursor-not-allowed disabled:text-library-muted dark:text-library-night-ochre dark:hover:bg-library-night-ochre-tint dark:disabled:text-library-night-muted',
                    LIBRARY_FOCUS
                  )}
                >
                  打开
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {readableFormat === 'chapters' ? (
        <section className={PANEL_CLASS}>
          <div className='flex items-center justify-between gap-3'>
            <h2
              className={cn(
                'text-lg font-semibold',
                LIBRARY_TEXT,
                LIBRARY_SERIF
              )}
            >
              章节目录
            </h2>
            <div
              className={cn(
                'rounded-sm bg-library-paper px-3 py-1 text-sm dark:bg-library-night',
                LIBRARY_MUTED
              )}
            >
              {chaptersLoading ? '加载中...' : `${chapters.length} 章`}
            </div>
          </div>
          {chaptersError ? (
            <div className='mt-4 text-sm text-red-600 dark:text-red-400'>
              {chaptersError}
            </div>
          ) : null}
          {!chaptersLoading && !chaptersError && chapters.length === 0 ? (
            <div className={cn('mt-4 text-sm', ROW_CLASS, LIBRARY_MUTED)}>
              源站当前没有返回章节，这不是 EPUB 文件缺失；请换有章节的搜索结果。
            </div>
          ) : null}
          {chapters.length > 0 ? (
            <div className='mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
              {visibleChapters.map((chapter) => (
                <Link
                  key={`${chapter.href}-${chapter.order}`}
                  href={buildBookReadPath(
                    detail.sourceId,
                    detail.id,
                    chapter.href
                  )}
                  onClick={() => cacheBookDetail(detail)}
                  className={cn(
                    'truncate text-sm transition-colors duration-200 hover:text-library-ochre dark:hover:text-library-night-ochre',
                    ROW_CLASS,
                    LIBRARY_TEXT,
                    LIBRARY_FOCUS
                  )}
                  title={chapter.title}
                >
                  {chapter.title}
                </Link>
              ))}
            </div>
          ) : null}
          {chapters.length > CHAPTER_PREVIEW_LIMIT && !showAllChapters ? (
            <button
              type='button'
              onClick={() => setShowAllChapters(true)}
              className={cn('mt-3', GHOST_BUTTON_CLASS)}
            >
              展开全部 {chapters.length} 章
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
