'use client';

import {
  BookOpen,
  Clock3,
  Database,
  FolderCog,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  deleteBookReadRecord,
  getAllBookReadRecords,
  getAllBookShelf,
  getCachedBookReadRecordsSnapshot,
} from '@/lib/book.db.client';
import { BookReadRecord, BookShelfItem } from '@/lib/book.types';
import {
  type CachedBookFile,
  deleteCachedBookFile,
  listCachedBookFiles,
} from '@/lib/book-cache.client';
import {
  buildBookReadPath,
  cacheBookReadRecord,
  cacheBookShelfItem,
} from '@/lib/book-route-cache.client';
import { cn } from '@/lib/cn';
import { subscribeToDataUpdates } from '@/lib/db.client';
import { processImageUrl } from '@/lib/utils';

import EmptyState from '@/components/media/EmptyState';
import {
  LIBRARY_ACCENT_ICON,
  LIBRARY_FOCUS,
  LIBRARY_GHOST_BUTTON,
  LIBRARY_ICON_BUTTON,
  LIBRARY_ICON_BUTTON_DANGER,
  LIBRARY_MUTED,
  LIBRARY_PANEL,
  LIBRARY_ROW,
  LIBRARY_SERIF,
  LIBRARY_TEXT,
} from '@/components/media/library';
import MediaGrid from '@/components/media/MediaGrid';
import MediaGridSkeleton from '@/components/media/MediaGridSkeleton';
import MediaPressCard from '@/components/media/MediaPressCard';

/** 缓存面板里的一行（书名 + 大小 + 删除键）。 */
const CARD_CLASS = cn(
  LIBRARY_ROW,
  'bg-library-card dark:bg-library-night-card'
);
const DANGER_BUTTON_CLASS =
  'cursor-pointer rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-red-700';

function looksLikeInternalHref(value?: string) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    /\.(xhtml|html|htm|xml)(#.*)?$/.test(normalized) ||
    /^nav\b/.test(normalized)
  );
}

function getReadableChapterLabel(item: BookReadRecord) {
  const candidates = [item.chapterTitle, item.locator.chapterTitle];
  for (const candidate of candidates) {
    const text = (candidate || '').trim();
    if (text && !looksLikeInternalHref(text)) return text;
  }
  return '定位已保存';
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function BookHistoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<Record<string, BookReadRecord>>({});
  const [shelf, setShelf] = useState<Record<string, BookShelfItem>>({});
  const [loading, setLoading] = useState(true);
  const [cacheModalOpen, setCacheModalOpen] = useState(false);
  const [cacheItems, setCacheItems] = useState<CachedBookFile[]>([]);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete-one' | 'clear-all';
    key?: string;
    title?: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    const cachedRecords = getCachedBookReadRecordsSnapshot();
    if (Object.keys(cachedRecords).length > 0) {
      setRecords(cachedRecords);
      setLoading(false);
    }

    getAllBookReadRecords()
      .then(setRecords)
      .catch(() => undefined)
      .finally(() => setLoading(false));
    getAllBookShelf()
      .then(setShelf)
      .catch(() => undefined);

    const unsubscribeHistory = subscribeToDataUpdates<
      Record<string, BookReadRecord>
    >('bookHistoryUpdated', setRecords);
    return unsubscribeHistory;
  }, []);

  const loadCacheItems = async () => {
    setCacheLoading(true);
    try {
      const items = await listCachedBookFiles();
      setCacheItems(items.sort((a, b) => b.lastOpenTime - a.lastOpenTime));
    } finally {
      setCacheLoading(false);
    }
  };

  useEffect(() => {
    if (!cacheModalOpen) return;
    void loadCacheItems();
  }, [cacheModalOpen]);

  const items = useMemo(
    () =>
      Object.entries(records)
        .map(([key, item]) => {
          const [fallbackSourceId = '', fallbackBookId = ''] = key.split('+');
          const shelfItem = shelf[key];
          return {
            ...item,
            storageKey: key,
            sourceId: item.sourceId || shelfItem?.sourceId || fallbackSourceId,
            bookId: item.bookId || shelfItem?.bookId || fallbackBookId,
            sourceName: item.sourceName || shelfItem?.sourceName || '',
            detailHref: item.detailHref || shelfItem?.detailHref,
            acquisitionHref: item.acquisitionHref || shelfItem?.acquisitionHref,
            cover: item.cover || shelfItem?.cover,
            author: item.author || shelfItem?.author,
            format: item.format || shelfItem?.format || 'epub',
          };
        })
        .sort((a, b) => b.saveTime - a.saveTime),
    [records, shelf]
  );

  const cacheTotalSize = useMemo(
    () => cacheItems.reduce((sum, item) => sum + item.size, 0),
    [cacheItems]
  );

  const handleDelete = async (item: (typeof items)[number]) => {
    const [deleteSourceId = item.sourceId, deleteBookId = item.bookId] =
      item.storageKey.split('+');
    await deleteBookReadRecord(deleteSourceId, deleteBookId);
    setRecords((prev) => {
      const next = { ...prev };
      delete next[item.storageKey];
      return next;
    });
  };

  /** 进阅读器之前先把记录和书架项写进路由缓存——阅读页靠它认书。 */
  const rememberOpen = (item: (typeof items)[number]) => {
    cacheBookReadRecord(item);
    if (!item.sourceId || !item.bookId) return;
    cacheBookShelfItem({
      sourceId: item.sourceId,
      sourceName: item.sourceName,
      bookId: item.bookId,
      title: item.title,
      author: item.author,
      cover: item.cover,
      format: item.format,
      detailHref: item.detailHref,
      acquisitionHref: item.acquisitionHref,
      saveTime: item.saveTime,
    });
  };

  return (
    <section className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className={cn('flex items-center gap-2 text-sm', LIBRARY_MUTED)}>
          <Clock3 className={cn('h-4 w-4', LIBRARY_ACCENT_ICON)} />共{' '}
          {items.length} 条记录
        </div>
        <button
          type='button'
          onClick={() => setCacheModalOpen(true)}
          className={cn(LIBRARY_ICON_BUTTON, LIBRARY_FOCUS)}
          aria-label='缓存管理'
          title='缓存管理'
        >
          <FolderCog className='h-5 w-5' />
        </button>
      </div>

      {loading ? (
        <MediaGridSkeleton count={12} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Clock3 className='h-7 w-7' />}
          title='还没有阅读记录'
          description='打开过的电子书会按时间排在这里，点卡片即可接着上次的位置读，长按卡片可删除。'
        />
      ) : (
        <MediaGrid>
          {items.map((item) => {
            const percent = Math.max(
              0,
              Math.min(100, Math.round(item.progressPercent || 0))
            );
            const readHref = item.sourceId
              ? buildBookReadPath(item.sourceId, item.bookId)
              : undefined;
            /** 短按和菜单里的「继续阅读」是同一件事，别再写两遍。 */
            const openReader = () => {
              if (!readHref) return;
              rememberOpen(item);
              router.push(readHref);
            };
            return (
              <MediaPressCard
                key={item.storageKey}
                item={{
                  key: item.storageKey,
                  title: item.title,
                  image: item.cover,
                  meta: item.sourceName,
                  subtitle: [
                    item.author,
                    item.sourceId
                      ? getReadableChapterLabel(item)
                      : '历史记录缺少书源信息',
                  ]
                    .filter(Boolean)
                    .join(' · '),
                  progress: percent,
                }}
                href={readHref}
                onNavigate={() => rememberOpen(item)}
                onPress={openReader}
                title={item.title}
                poster={item.cover ? processImageUrl(item.cover) : undefined}
                sourceName={item.sourceName}
                actions={[
                  {
                    id: 'continue-reading',
                    label: '继续阅读',
                    icon: <BookOpen size={20} />,
                    onClick: openReader,
                    color: 'primary' as const,
                  },
                  {
                    id: 'delete',
                    label: '删除',
                    icon: <Trash2 size={20} />,
                    onClick: () => void handleDelete(item),
                    color: 'danger' as const,
                  },
                ]}
              />
            );
          })}
        </MediaGrid>
      )}

      {cacheModalOpen &&
        mounted &&
        createPortal(
          <div
            className='fixed inset-0 z-50 bg-black/45 backdrop-blur-sm'
            onClick={() => setCacheModalOpen(false)}
          >
            <div
              className='absolute right-0 top-0 h-screen w-full max-w-lg overflow-y-auto border-l border-library-edge bg-library-paper shadow-2xl dark:border-library-night-edge dark:bg-library-night'
              onClick={(event) => event.stopPropagation()}
            >
              <div className='space-y-5 p-5'>
                <div className={cn(LIBRARY_PANEL, 'p-4')}>
                  <div className='flex items-start justify-between gap-4'>
                    <div>
                      <div
                        className={cn(
                          'flex items-center gap-2 text-base font-semibold',
                          LIBRARY_TEXT,
                          LIBRARY_SERIF
                        )}
                      >
                        <Database
                          className={cn('h-4 w-4', LIBRARY_ACCENT_ICON)}
                        />
                        缓存管理
                      </div>
                      <div className={cn('mt-1 text-xs', LIBRARY_MUTED)}>
                        已缓存 {cacheItems.length} 本 ·{' '}
                        {formatBytes(cacheTotalSize)}
                      </div>
                    </div>
                    <div className='flex gap-2'>
                      <button
                        type='button'
                        onClick={() => void loadCacheItems()}
                        className={cn(LIBRARY_ICON_BUTTON, LIBRARY_FOCUS)}
                        aria-label='刷新缓存'
                        title='刷新缓存'
                      >
                        <RefreshCw className='h-4 w-4' />
                      </button>
                      <button
                        type='button'
                        onClick={() => setConfirmAction({ type: 'clear-all' })}
                        className={cn(
                          LIBRARY_ICON_BUTTON_DANGER,
                          LIBRARY_FOCUS
                        )}
                        aria-label='清空全部缓存'
                        title='清空全部缓存'
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                      <button
                        type='button'
                        onClick={() => setCacheModalOpen(false)}
                        className={cn(LIBRARY_ICON_BUTTON, LIBRARY_FOCUS)}
                        aria-label='关闭'
                        title='关闭'
                      >
                        <X className='h-4 w-4' />
                      </button>
                    </div>
                  </div>
                </div>

                {cacheLoading ? (
                  <EmptyState description='正在读取缓存…' />
                ) : null}
                {!cacheLoading && cacheItems.length === 0 ? (
                  <EmptyState
                    icon={<Database className='h-7 w-7' />}
                    title='还没有缓存书籍'
                    description='在线阅读过的电子书会把文件存在本地，这里可以查看与清理。'
                  />
                ) : null}

                <div className='space-y-3'>
                  {cacheItems.map((item) => (
                    <div key={item.key} className={cn(CARD_CLASS, 'p-4')}>
                      <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0 flex-1'>
                          <div
                            className={cn(
                              'truncate font-semibold',
                              LIBRARY_TEXT
                            )}
                          >
                            {item.title}
                          </div>
                          <div className={cn('mt-1 text-xs', LIBRARY_MUTED)}>
                            格式 {item.format.toUpperCase()} · 大小{' '}
                            {formatBytes(item.size)}
                          </div>
                          <div className={cn('mt-1 text-xs', LIBRARY_MUTED)}>
                            最近打开{' '}
                            {new Date(item.lastOpenTime).toLocaleString()}
                          </div>
                        </div>
                        <button
                          type='button'
                          onClick={() =>
                            setConfirmAction({
                              type: 'delete-one',
                              key: item.key,
                              title: item.title,
                            })
                          }
                          className={cn(
                            LIBRARY_ICON_BUTTON_DANGER,
                            LIBRARY_FOCUS
                          )}
                          aria-label='删除缓存'
                          title='删除缓存'
                        >
                          <Trash2 className='h-4 w-4' />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {confirmAction &&
        mounted &&
        createPortal(
          <div
            className='fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm'
            onClick={() => setConfirmAction(null)}
          >
            <div
              className={cn(LIBRARY_PANEL, 'w-full max-w-sm p-5 shadow-2xl')}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                className={cn(
                  'flex items-center gap-2 text-base font-semibold',
                  LIBRARY_TEXT,
                  LIBRARY_SERIF
                )}
              >
                <Trash2 className='h-4 w-4 text-red-600 dark:text-red-400' />
                {confirmAction.type === 'clear-all'
                  ? '清空全部缓存'
                  : '删除缓存'}
              </div>
              <div className={cn('mt-2 text-sm', LIBRARY_MUTED)}>
                {confirmAction.type === 'clear-all'
                  ? '确认清空当前浏览器中的全部电子书缓存吗？此操作不可撤销。'
                  : `确认删除《${
                      confirmAction.title || '该书'
                    }》的本地缓存吗？`}
              </div>
              <div className='mt-5 flex justify-end gap-3'>
                <button
                  type='button'
                  onClick={() => setConfirmAction(null)}
                  className={cn(
                    LIBRARY_GHOST_BUTTON,
                    'cursor-pointer px-4 py-2 text-sm'
                  )}
                >
                  取消
                </button>
                <button
                  type='button'
                  onClick={async () => {
                    if (confirmAction.type === 'clear-all') {
                      await Promise.all(
                        cacheItems.map((item) => deleteCachedBookFile(item.key))
                      );
                      setCacheItems([]);
                    } else if (confirmAction.key) {
                      await deleteCachedBookFile(confirmAction.key);
                      setCacheItems((prev) =>
                        prev.filter((item) => item.key !== confirmAction.key)
                      );
                    }
                    setConfirmAction(null);
                  }}
                  className={cn(DANGER_BUTTON_CLASS, LIBRARY_FOCUS)}
                >
                  确认
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
