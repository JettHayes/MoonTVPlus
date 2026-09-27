'use client';

import { CheckCircle2, Compass, Search, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getAllBookReadRecords } from '@/lib/book.db.client';
import { BookReadRecord, BookSource } from '@/lib/book.types';
import { buildBookReadPath } from '@/lib/book-route-cache.client';
import { cn } from '@/lib/cn';

import ContinueReadingCard from '@/components/media/ContinueReadingCard';
import EmptyState from '@/components/media/EmptyState';
import {
  BOOK_RAIL_ITEM,
  LIBRARY_BUTTON,
  LIBRARY_GHOST_BUTTON,
  LIBRARY_MUTED,
  LIBRARY_PANEL,
  LIBRARY_SERIF,
} from '@/components/media/library';
import MediaCard from '@/components/media/MediaCard';
import MediaRail from '@/components/media/MediaRail';
import MediaSectionHeader from '@/components/media/MediaSectionHeader';

function SourceCardSkeleton() {
  return (
    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className={cn(LIBRARY_PANEL, 'p-5')}>
          <div className='h-5 w-32 animate-pulse rounded-sm bg-library-edge dark:bg-library-night-edge' />
          <div className='mt-3 flex gap-2'>
            <div className='h-6 w-16 animate-pulse rounded-sm bg-library-edge dark:bg-library-night-edge' />
            <div className='h-6 w-16 animate-pulse rounded-sm bg-library-edge dark:bg-library-night-edge' />
          </div>
          <div className='mt-5 flex gap-2'>
            <div className='h-10 w-24 animate-pulse rounded-md bg-library-edge dark:bg-library-night-edge' />
            <div className='h-10 w-24 animate-pulse rounded-md bg-library-edge dark:bg-library-night-edge' />
          </div>
        </div>
      ))}
    </div>
  );
}

function CapabilityPill({
  enabled,
  children,
}: {
  enabled?: boolean;
  children: React.ReactNode;
}) {
  const Icon = enabled ? CheckCircle2 : XCircle;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs ring-1',
        enabled
          ? 'bg-library-ochre-tint text-library-ochre ring-library-ochre/25 dark:bg-library-night-ochre-tint dark:text-library-night-ochre dark:ring-library-night-ochre/25'
          : 'text-library-muted ring-library-edge dark:text-library-night-muted dark:ring-library-night-edge'
      )}
    >
      <Icon className='h-3.5 w-3.5' />
      {children}
    </span>
  );
}

function readRecordMeta(record: BookReadRecord) {
  return [record.sourceName, record.chapterTitle, record.author]
    .filter(Boolean)
    .join(' · ');
}

export default function BooksHomePage() {
  const [sources, setSources] = useState<BookSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [readRecords, setReadRecords] = useState<BookReadRecord[]>([]);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      !(window as Window & { RUNTIME_CONFIG?: { BOOKS_ENABLED?: boolean } })
        .RUNTIME_CONFIG?.BOOKS_ENABLED
    ) {
      window.location.href = '/';
      return;
    }
    fetch('/api/books/sources')
      .then((res) => res.json())
      .then((data) => setSources(data.sources || []))
      .catch((err) => setError(err.message || '加载书源失败'))
      .finally(() => setLoading(false));

    getAllBookReadRecords()
      .then((records) =>
        setReadRecords(
          Object.values(records).sort((a, b) => b.saveTime - a.saveTime)
        )
      )
      .catch(() => undefined);
  }, []);

  const currentRecord = readRecords[0];
  // 顶部「正在读」大卡已经摊开第一本，这里只列其余的，避免同一本重复出现。
  const recentRecords = readRecords.slice(1, 13);

  return (
    <div className='space-y-8'>
      {currentRecord ? (
        <ContinueReadingCard
          title={currentRecord.title}
          image={currentRecord.cover}
          meta={readRecordMeta(currentRecord)}
          progress={currentRecord.progressPercent}
          href={buildBookReadPath(
            currentRecord.sourceId,
            currentRecord.bookId,
            currentRecord.chapterHref
          )}
        />
      ) : (
        <section
          className={cn(
            LIBRARY_PANEL,
            'flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6'
          )}
        >
          <div className='min-w-0'>
            <h1
              className={cn(
                'text-xl font-semibold text-library-ink dark:text-library-night-ink',
                LIBRARY_SERIF
              )}
            >
              电子书馆
            </h1>
            <p className={cn('mt-1.5 text-sm', LIBRARY_MUTED)}>
              选择一个书源开始浏览，或直接搜索书名与作者。
            </p>
          </div>
          <Link href='/books/search' className={LIBRARY_BUTTON}>
            <Search className='h-4 w-4' />
            搜索书籍
          </Link>
        </section>
      )}

      {recentRecords.length > 0 ? (
        <MediaRail title='最近在读'>
          {recentRecords.map((record) => (
            <div
              key={`${record.sourceId}-${record.bookId}`}
              className={BOOK_RAIL_ITEM}
            >
              <MediaCard
                item={{
                  key: `${record.sourceId}-${record.bookId}`,
                  title: record.title,
                  image: record.cover,
                  progress: record.progressPercent,
                }}
                href={buildBookReadPath(
                  record.sourceId,
                  record.bookId,
                  record.chapterHref
                )}
              />
            </div>
          ))}
        </MediaRail>
      ) : null}

      <section className='space-y-4'>
        <MediaSectionHeader
          title='书源'
          subtitle={
            loading ? '正在加载书源…' : `共 ${sources.length} 个可用书源`
          }
          action={
            currentRecord ? (
              <Link href='/books/search' className={LIBRARY_GHOST_BUTTON}>
                <Search className='h-3.5 w-3.5' />
                搜索书籍
              </Link>
            ) : undefined
          }
        />

        {loading ? <SourceCardSkeleton /> : null}

        {error ? <EmptyState tone='error' description={error} /> : null}

        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {sources.map((source) => (
            <article key={source.id} className={cn(LIBRARY_PANEL, 'p-5')}>
              <div className='min-w-0'>
                <div
                  className={cn(
                    'truncate text-base font-semibold text-library-ink dark:text-library-night-ink',
                    LIBRARY_SERIF
                  )}
                >
                  {source.name}
                </div>
                <div className={cn('mt-1 text-xs font-medium', LIBRARY_MUTED)}>
                  {source.type === 'legado' ? 'Legado' : 'OPDS'}
                </div>
              </div>

              <div className='mt-4 flex flex-wrap gap-2'>
                <CapabilityPill enabled={source.capabilities?.catalogSupported}>
                  分类
                  {source.capabilities?.catalogSupported ? '可用' : '不可用'}
                </CapabilityPill>
                <CapabilityPill enabled={source.capabilities?.searchSupported}>
                  搜索
                  {source.capabilities?.searchSupported ? '可用' : '不可用'}
                </CapabilityPill>
              </div>

              <div className='mt-5 flex flex-wrap gap-2'>
                {source.capabilities?.catalogSupported && (
                  <Link
                    href={`/books/catalog?sourceId=${encodeURIComponent(
                      source.id
                    )}`}
                    className={LIBRARY_BUTTON}
                  >
                    浏览目录
                  </Link>
                )}
                {source.capabilities?.searchSupported && (
                  <Link
                    href={`/books/search?sourceId=${encodeURIComponent(
                      source.id
                    )}`}
                    className={LIBRARY_GHOST_BUTTON}
                  >
                    搜索书籍
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>

        {!loading && !error && sources.length === 0 ? (
          <EmptyState
            icon={<Compass className='h-7 w-7' />}
            title='暂无可用书源'
            description='请在管理端配置 OPDS 或 Legado 书源后重试。'
          />
        ) : null}
      </section>
    </div>
  );
}
