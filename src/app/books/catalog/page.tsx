'use client';

import { BookX, Compass, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  WheelEvent as ReactWheelEvent,
} from 'react';

import { BookCatalogResult, BookListItem, BookSource } from '@/lib/book.types';
import {
  buildBookDetailPath,
  cacheBookListItem,
} from '@/lib/book-route-cache.client';
import { cn } from '@/lib/cn';

import { bookCardItem } from '@/components/media/adapters';
import EmptyState from '@/components/media/EmptyState';
import {
  LIBRARY_GHOST_BUTTON,
  LIBRARY_SKELETON,
  SPINE_TAB,
  SPINE_TAB_ACTIVE,
  SPINE_TAB_IDLE,
} from '@/components/media/library';
import MediaCard from '@/components/media/MediaCard';
import MediaGrid from '@/components/media/MediaGrid';
import MediaGridSkeleton from '@/components/media/MediaGridSkeleton';

function makeHref(sourceId: string, item: BookListItem) {
  return buildBookDetailPath(sourceId, item.id);
}

/** 书源 / 分类两排都是书脊标签，横向拖拽滚动，隐藏滚动条。 */
const CHIP_ROW =
  'flex flex-nowrap gap-1 overflow-x-auto border-b border-library-edge px-1 pt-1 cursor-grab select-none touch-pan-x [scrollbar-width:none] active:cursor-grabbing dark:border-library-night-edge [&::-webkit-scrollbar]:hidden';

function CatalogSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='flex gap-1 overflow-x-auto pb-1'>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={cn('h-9 w-24 shrink-0', LIBRARY_SKELETON)}
          />
        ))}
      </div>
      <div className='flex gap-1 overflow-x-auto pb-1'>
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className={cn('h-9 w-28 shrink-0', LIBRARY_SKELETON)}
          />
        ))}
      </div>
      <MediaGridSkeleton count={12} />
    </div>
  );
}

function LoadingMoreSkeleton() {
  return <MediaGridSkeleton count={6} />;
}

function isMeaningfulNavTitle(title?: string) {
  const text = (title || '').trim();
  return !!text && text !== '目录';
}

export default function BooksCatalogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceId = searchParams.get('sourceId') || '';
  const href = searchParams.get('href') || '';
  const [sources, setSources] = useState<BookSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState(sourceId);
  const [selectedHref, setSelectedHref] = useState(href);
  const [data, setData] = useState<BookCatalogResult | null>(null);
  const [catalogNavigation, setCatalogNavigation] = useState<
    BookCatalogResult['navigation']
  >([]);
  const [entries, setEntries] = useState<BookListItem[]>([]);
  const [nextHref, setNextHref] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const sourceScrollerRef = useRef<HTMLDivElement | null>(null);
  const activeSourceItemRef = useRef<HTMLAnchorElement | null>(null);
  const navScrollerRef = useRef<HTMLDivElement | null>(null);
  const activeNavItemRef = useRef<HTMLAnchorElement | null>(null);
  const loadedPageHrefsRef = useRef<Set<string>>(new Set());
  const failedPageHrefsRef = useRef<Set<string>>(new Set());
  const sourceDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
    pointerType: string;
  } | null>(null);
  const suppressSourceClickRef = useRef(false);
  const navDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
    pointerType: string;
  } | null>(null);
  const suppressNavClickRef = useRef(false);

  const showImmediateContentLoading = useCallback(() => {
    setError('');
    setLoadingCatalog(true);
    setEntries([]);
    setNextHref(undefined);
  }, []);

  useEffect(() => {
    fetch('/api/books/sources')
      .then((res) => res.json())
      .then((json) => setSources(json.sources || []));
  }, []);

  useEffect(() => {
    setSelectedSourceId(sourceId);
    setCatalogNavigation([]);
  }, [sourceId]);

  useEffect(() => {
    setSelectedHref(href);
  }, [href]);

  useEffect(() => {
    if (!sourceId || !href || catalogNavigation.length > 0) return;
    let cancelled = false;

    const loadRootNavigation = async () => {
      try {
        const params = new URLSearchParams({ sourceId });
        const res = await fetch(`/api/books/catalog?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) return;
        if (!cancelled)
          setCatalogNavigation((json as BookCatalogResult).navigation || []);
      } catch {
        // 当前分类内容仍可正常展示，根目录分类加载失败时忽略。
      }
    };

    void loadRootNavigation();
    return () => {
      cancelled = true;
    };
  }, [sourceId, href, catalogNavigation.length]);

  useEffect(() => {
    if (!sourceId || href || catalogNavigation.length === 0) return;
    const firstNavigationItem = catalogNavigation.find((item) => {
      const rel = (item.rel || '').toLowerCase();
      return (
        item.href &&
        rel !== 'next' &&
        rel !== 'previous' &&
        isMeaningfulNavTitle(item.title)
      );
    });
    if (!firstNavigationItem?.href) return;
    setSelectedHref(firstNavigationItem.href);
    router.replace(
      `/books/catalog?sourceId=${encodeURIComponent(
        sourceId
      )}&href=${encodeURIComponent(firstNavigationItem.href)}`
    );
  }, [catalogNavigation, href, router, sourceId]);

  const mergeEntries = useCallback(
    (prev: BookListItem[], next: BookListItem[]) => {
      const seen = new Set(
        prev.map(
          (item) =>
            `${item.sourceId}::${item.id}::${
              item.detailHref || item.acquisitionLinks[0]?.href || ''
            }`
        )
      );
      const merged = [...prev];
      for (const item of next) {
        const key = `${item.sourceId}::${item.id}::${
          item.detailHref || item.acquisitionLinks[0]?.href || ''
        }`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(item);
        }
      }
      return merged;
    },
    []
  );

  const loadCatalog = useCallback(
    async (targetHref?: string, append = false) => {
      if (!sourceId) return;
      const normalizedHref = targetHref || '';
      if (append) {
        if (
          !normalizedHref ||
          loadedPageHrefsRef.current.has(normalizedHref) ||
          failedPageHrefsRef.current.has(normalizedHref)
        )
          return;
        setLoadingMore(true);
      } else {
        setError('');
        setLoadingCatalog(true);
        if (!normalizedHref) setData(null);
        setEntries([]);
        setNextHref(undefined);
        loadedPageHrefsRef.current = new Set(
          normalizedHref ? [normalizedHref] : ['__root__']
        );
        failedPageHrefsRef.current = new Set();
      }

      try {
        const params = new URLSearchParams({ sourceId });
        if (normalizedHref) params.set('href', normalizedHref);
        const res = await fetch(`/api/books/catalog?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '获取目录失败');
        const nextData = json as BookCatalogResult;
        if (append) {
          loadedPageHrefsRef.current.add(normalizedHref);
          setEntries((prev) => mergeEntries(prev, nextData.entries || []));
        } else {
          setData(nextData);
          setCatalogNavigation((prev) =>
            normalizedHref
              ? prev.length > 0
                ? prev
                : nextData.navigation || []
              : nextData.navigation || []
          );
          setEntries(nextData.entries || []);
        }
        setNextHref(nextData.nextHref || undefined);
        if (!append) setData(nextData);
      } catch (err) {
        if (append && normalizedHref) {
          failedPageHrefsRef.current.add(normalizedHref);
          setNextHref(undefined);
        }
        setError(err instanceof Error ? err.message : '获取目录失败');
      } finally {
        if (!append) setLoadingCatalog(false);
        setLoadingMore(false);
      }
    },
    [mergeEntries, sourceId]
  );

  useEffect(() => {
    if (!sourceId) return;
    void loadCatalog(href, false);
  }, [sourceId, href, loadCatalog]);

  // 失败态和空目录态的「重试」都走这里：留在原页重取当前分类，不整页刷新。
  const retryCatalog = useCallback(() => {
    void loadCatalog(href, false);
  }, [href, loadCatalog]);

  useEffect(() => {
    const node = loaderRef.current;
    if (!node || !nextHref || loadingMore || !data) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && nextHref && !loadingMore) {
          void loadCatalog(nextHref, true);
        }
      },
      { rootMargin: '800px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [data, nextHref, loadingMore, loadCatalog]);

  const handleSourcePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const node = sourceScrollerRef.current;
      if (!node) return;
      sourceDragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startScrollLeft: node.scrollLeft,
        moved: false,
        pointerType: event.pointerType,
      };
      suppressSourceClickRef.current = false;
      if (event.pointerType !== 'mouse') {
        node.setPointerCapture?.(event.pointerId);
      }
    },
    []
  );

  const handleSourcePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const node = sourceScrollerRef.current;
      const dragState = sourceDragStateRef.current;
      if (!node || !dragState || dragState.pointerId !== event.pointerId)
        return;
      const deltaX = event.clientX - dragState.startX;
      const moveThreshold = dragState.pointerType === 'mouse' ? 8 : 4;
      if (Math.abs(deltaX) > moveThreshold) {
        dragState.moved = true;
        suppressSourceClickRef.current = true;
      }
      node.scrollLeft = dragState.startScrollLeft - deltaX;
    },
    []
  );

  const handleSourcePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const node = sourceScrollerRef.current;
      const dragState = sourceDragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      if (dragState.moved) {
        event.preventDefault();
        window.setTimeout(() => {
          suppressSourceClickRef.current = false;
        }, 0);
      }
      sourceDragStateRef.current = null;
      if (dragState.pointerType !== 'mouse') {
        node?.releasePointerCapture?.(event.pointerId);
      }
    },
    []
  );

  const handleSourcePointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') return;
      handleSourcePointerUp(event);
    },
    [handleSourcePointerUp]
  );

  const handleSourceWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      const node = sourceScrollerRef.current;
      if (!node) return;
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      if (!delta) return;
      node.scrollLeft += delta;
    },
    []
  );

  const handleNavPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const node = navScrollerRef.current;
      if (!node) return;
      navDragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startScrollLeft: node.scrollLeft,
        moved: false,
        pointerType: event.pointerType,
      };
      suppressNavClickRef.current = false;
      if (event.pointerType !== 'mouse') {
        node.setPointerCapture?.(event.pointerId);
      }
    },
    []
  );

  const handleNavPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const node = navScrollerRef.current;
      const dragState = navDragStateRef.current;
      if (!node || !dragState || dragState.pointerId !== event.pointerId)
        return;
      const deltaX = event.clientX - dragState.startX;
      const moveThreshold = dragState.pointerType === 'mouse' ? 8 : 4;
      if (Math.abs(deltaX) > moveThreshold) {
        dragState.moved = true;
        suppressNavClickRef.current = true;
      }
      node.scrollLeft = dragState.startScrollLeft - deltaX;
    },
    []
  );

  const handleNavPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const node = navScrollerRef.current;
      const dragState = navDragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      if (dragState.moved) {
        event.preventDefault();
        window.setTimeout(() => {
          suppressNavClickRef.current = false;
        }, 0);
      }
      navDragStateRef.current = null;
      if (dragState.pointerType !== 'mouse') {
        node?.releasePointerCapture?.(event.pointerId);
      }
    },
    []
  );

  const handleNavPointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') return;
      handleNavPointerUp(event);
    },
    [handleNavPointerUp]
  );

  const handleNavWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      const node = navScrollerRef.current;
      if (!node) return;
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      if (!delta) return;
      node.scrollLeft += delta;
    },
    []
  );

  const navigationItems = useMemo(() => {
    const items = (catalogNavigation || []).filter((item) => {
      const rel = (item.rel || '').toLowerCase();
      if (rel === 'next' || rel === 'previous') return false;
      return isMeaningfulNavTitle(item.title);
    });

    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.href}::${(item.title || '').trim()}`;
      if (!item.href || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [catalogNavigation]);

  useLayoutEffect(() => {
    if (!selectedHref || navigationItems.length === 0) return;

    const frameId = window.requestAnimationFrame(() => {
      const container = navScrollerRef.current;
      const activeItem = activeNavItemRef.current;
      if (!container || !activeItem) return;

      const containerRect = container.getBoundingClientRect();
      const activeRect = activeItem.getBoundingClientRect();
      const targetLeft =
        container.scrollLeft +
        activeRect.left -
        containerRect.left -
        (container.clientWidth - activeItem.clientWidth) / 2;
      container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedHref, navigationItems]);

  useLayoutEffect(() => {
    if (!selectedSourceId || sources.length === 0) return;

    const frameId = window.requestAnimationFrame(() => {
      const container = sourceScrollerRef.current;
      const activeItem = activeSourceItemRef.current;
      if (!container || !activeItem) return;

      const containerRect = container.getBoundingClientRect();
      const activeRect = activeItem.getBoundingClientRect();
      const targetLeft =
        container.scrollLeft +
        activeRect.left -
        containerRect.left -
        (container.clientWidth - activeItem.clientWidth) / 2;
      container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedSourceId, sources.length]);

  return (
    <div className='space-y-4'>
      <div
        ref={sourceScrollerRef}
        className={CHIP_ROW}
        onPointerDown={handleSourcePointerDown}
        onPointerMove={handleSourcePointerMove}
        onPointerUp={handleSourcePointerUp}
        onPointerCancel={handleSourcePointerUp}
        onPointerLeave={handleSourcePointerLeave}
        onWheel={handleSourceWheel}
      >
        {sources.map((source) => (
          <Link
            key={source.id}
            ref={
              source.id === selectedSourceId ? activeSourceItemRef : undefined
            }
            href={`/books/catalog?sourceId=${encodeURIComponent(source.id)}`}
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            onClick={(event) => {
              if (suppressSourceClickRef.current) {
                event.preventDefault();
                suppressSourceClickRef.current = false;
                return;
              }
              setSelectedSourceId(source.id);
              setSelectedHref('');
              showImmediateContentLoading();
            }}
            className={cn(
              SPINE_TAB,
              source.id === selectedSourceId ? SPINE_TAB_ACTIVE : SPINE_TAB_IDLE
            )}
          >
            {source.name}
          </Link>
        ))}
      </div>
      {/* 没带 sourceId 时以前会一直停在骨架屏上——那是加载态，不是「等参数」态。 */}
      {!sourceId ? (
        <EmptyState
          icon={<Compass className='h-7 w-7' />}
          title='还没有选择书源'
          description='从电子书馆挑一个书源，再进它的目录浏览。'
          action={
            <Link href='/books' className={LIBRARY_GHOST_BUTTON}>
              回到电子书馆
            </Link>
          }
        />
      ) : data || navigationItems.length > 0 || error ? (
        <>
          {navigationItems.length > 0 ? (
            <div
              ref={navScrollerRef}
              className={CHIP_ROW}
              onPointerDown={handleNavPointerDown}
              onPointerMove={handleNavPointerMove}
              onPointerUp={handleNavPointerUp}
              onPointerCancel={handleNavPointerUp}
              onPointerLeave={handleNavPointerLeave}
              onWheel={handleNavWheel}
            >
              {navigationItems.map((item, index) => (
                <Link
                  key={`${item.href}-${index}`}
                  ref={
                    item.href === selectedHref ? activeNavItemRef : undefined
                  }
                  href={`/books/catalog?sourceId=${encodeURIComponent(
                    sourceId
                  )}&href=${encodeURIComponent(item.href)}`}
                  draggable={false}
                  onDragStart={(event) => event.preventDefault()}
                  onClick={(event) => {
                    if (suppressNavClickRef.current) {
                      event.preventDefault();
                      suppressNavClickRef.current = false;
                      return;
                    }
                    setSelectedHref(item.href);
                    showImmediateContentLoading();
                  }}
                  className={cn(
                    SPINE_TAB,
                    item.href === selectedHref
                      ? SPINE_TAB_ACTIVE
                      : SPINE_TAB_IDLE
                  )}
                >
                  {item.title.trim()}
                </Link>
              ))}
            </div>
          ) : null}
          {error ? (
            <EmptyState
              tone='error'
              title='目录加载失败'
              description={error}
              action={
                <button
                  type='button'
                  onClick={retryCatalog}
                  className={LIBRARY_GHOST_BUTTON}
                >
                  <RefreshCw className='h-4 w-4' />
                  重试
                </button>
              }
            />
          ) : loadingCatalog ? (
            <LoadingMoreSkeleton />
          ) : entries.length === 0 ? (
            // 请求成功但一本都没有（空分类、分页越界、或是源自己出了问题）：
            // 以前这里渲染的是空网格，整页只剩顶上两排标签，看着就是白屏。
            <EmptyState
              icon={<BookX className='h-7 w-7' />}
              title='这个分类里没有书'
              description='换一个分类看看，或重新加载一次。'
              action={
                <button
                  type='button'
                  onClick={retryCatalog}
                  className={LIBRARY_GHOST_BUTTON}
                >
                  <RefreshCw className='h-4 w-4' />
                  重新加载
                </button>
              }
            />
          ) : (
            <MediaGrid>
              {entries.map((item) => (
                <MediaCard
                  key={`${item.sourceId}-${item.id}-${
                    item.detailHref || item.acquisitionLinks[0]?.href || ''
                  }`}
                  item={bookCardItem(item)}
                  href={makeHref(sourceId, item)}
                  onNavigate={() => cacheBookListItem(item)}
                />
              ))}
            </MediaGrid>
          )}
          {loadingMore ? <LoadingMoreSkeleton /> : null}
          {!loadingMore && nextHref ? (
            <div ref={loaderRef} className='h-8 w-full' />
          ) : null}
        </>
      ) : (
        <CatalogSkeleton />
      )}
    </div>
  );
}
