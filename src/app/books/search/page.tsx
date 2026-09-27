'use client';

import { Loader2, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { BookListItem, BookSearchResult, BookSource } from '@/lib/book.types';
import {
  buildBookDetailPath,
  cacheBookListItem,
} from '@/lib/book-route-cache.client';
import { cn } from '@/lib/cn';

import { bookCardItem } from '@/components/media/adapters';
import EmptyState from '@/components/media/EmptyState';
import {
  LIBRARY_BUTTON,
  LIBRARY_FIELD,
  LIBRARY_FOCUS,
  LIBRARY_GHOST_BUTTON,
  LIBRARY_MUTED,
  LIBRARY_PANEL,
  LIBRARY_PROGRESS_BAR,
  LIBRARY_PROGRESS_TRACK,
  LIBRARY_SERIF,
  LIBRARY_TEXT,
} from '@/components/media/library';
import MediaCard from '@/components/media/MediaCard';
import MediaGrid from '@/components/media/MediaGrid';
import MediaGridSkeleton from '@/components/media/MediaGridSkeleton';
import MediaSectionHeader from '@/components/media/MediaSectionHeader';

type RuntimeWindow = Window & { RUNTIME_CONFIG?: { FLUID_SEARCH?: boolean } };

const PANEL_CLASS = cn(LIBRARY_PANEL, 'p-5 sm:p-6');
const FIELD_CLASS = cn(LIBRARY_FIELD, 'h-12 py-0');
const CHIP_CLASS = cn(
  LIBRARY_GHOST_BUTTON,
  'cursor-pointer gap-1.5 rounded-full px-3 py-1.5 text-xs'
);

function detailHref(item: BookListItem) {
  return buildBookDetailPath(item.sourceId, item.id);
}

const BOOK_SEARCH_STATE_KEY = 'book_search_state';
const EMPTY_RESULT: BookSearchResult = { results: [], failedSources: [] };
const QUICK_SEARCHES = ['三体', '刘慈欣', '东野圭吾', '哈利波特'];

export default function BooksSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const urlSourceId = searchParams.get('sourceId') || '';

  const [q, setQ] = useState(urlQuery);
  const [sourceId, setSourceId] = useState(urlSourceId);
  const [sources, setSources] = useState<BookSource[]>([]);
  const [result, setResult] = useState<BookSearchResult>(EMPTY_RESULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  // 已经**执行过**的那次搜索用的书源，用来标注「当前范围」。
  // 不能直接拿下拉框的值：下拉框是下一次搜索的参数，它一变就改写标注的话，
  // 标注会和下面那批书对不上（下拉切到 A，展示的还是 B 的结果）。
  const [executedScope, setExecutedScope] = useState('');
  const [totalSources, setTotalSources] = useState(0);
  const [completedSources, setCompletedSources] = useState(0);
  const [useFluidSearch, setUseFluidSearch] = useState(true);

  const restoredRef = useRef(false);
  const forceNextUrlSearchRef = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentSearchKeyRef = useRef('');
  const pendingResultsRef = useRef<BookListItem[]>([]);
  const flushTimerRef = useRef<number | null>(null);

  const getCacheKey = useCallback(
    (keyword: string, selectedSourceId: string) =>
      `book_search_cache_${selectedSourceId || 'all'}_${keyword.trim()}`,
    []
  );

  const getCachedResult = useCallback(
    (keyword: string, selectedSourceId: string) => {
      if (typeof window === 'undefined' || !keyword.trim()) return null;
      try {
        const raw = sessionStorage.getItem(
          getCacheKey(keyword, selectedSourceId)
        );
        return raw ? (JSON.parse(raw) as BookSearchResult) : null;
      } catch {
        return null;
      }
    },
    [getCacheKey]
  );

  const setCachedResult = useCallback(
    (
      keyword: string,
      selectedSourceId: string,
      nextResult: BookSearchResult
    ) => {
      if (typeof window === 'undefined' || !keyword.trim()) return;
      try {
        sessionStorage.setItem(
          getCacheKey(keyword, selectedSourceId),
          JSON.stringify(nextResult)
        );
      } catch {
        // Ignore storage/browser cleanup failures.
      }
    },
    [getCacheKey]
  );

  const readFluidSearchSetting = useCallback(() => {
    if (typeof window === 'undefined') return true;
    try {
      const savedFluidSearch = localStorage.getItem('fluidSearch');
      if (savedFluidSearch !== null)
        return JSON.parse(savedFluidSearch) !== false;
    } catch {
      // Ignore storage/browser cleanup failures.
    }
    return (window as RuntimeWindow).RUNTIME_CONFIG?.FLUID_SEARCH !== false;
  }, []);

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch {
        // Ignore cleanup failures.
      }
      eventSourceRef.current = null;
    }
  }, []);

  const clearPendingResults = useCallback(() => {
    pendingResultsRef.current = [];
    if (flushTimerRef.current) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  const appendBufferedResults = useCallback((nextResults: BookListItem[]) => {
    if (nextResults.length === 0) return;
    pendingResultsRef.current.push(...nextResults);
    if (!flushTimerRef.current) {
      flushTimerRef.current = window.setTimeout(() => {
        const toAppend = pendingResultsRef.current;
        pendingResultsRef.current = [];
        startTransition(() => {
          setResult((prev) => ({
            ...prev,
            results: prev.results.concat(toAppend),
          }));
        });
        flushTimerRef.current = null;
      }, 80);
    }
  }, []);

  const saveSearchState = useCallback(
    (nextState: { q: string; sourceId: string; result: BookSearchResult }) => {
      if (typeof window === 'undefined') return;
      try {
        sessionStorage.setItem(
          BOOK_SEARCH_STATE_KEY,
          JSON.stringify(nextState)
        );
      } catch {
        // Ignore storage failures.
      }
    },
    []
  );

  const restoreSearchState = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(BOOK_SEARCH_STATE_KEY);
      return raw
        ? (JSON.parse(raw) as {
            q: string;
            sourceId: string;
            result: BookSearchResult;
          })
        : null;
    } catch {
      return null;
    }
  }, []);

  const performSearch = useCallback(
    async (
      keyword: string,
      selectedSourceId: string,
      options?: { forceRefresh?: boolean }
    ) => {
      const trimmed = keyword.trim();
      if (!trimmed) return;
      const normalizedSourceId = selectedSourceId || '';
      const searchKey = `${normalizedSourceId}::${trimmed}`;
      const forceRefresh = options?.forceRefresh === true;

      closeEventSource();
      clearPendingResults();
      currentSearchKeyRef.current = searchKey;
      setLoading(true);
      setError('');
      setHasSearched(true);
      setExecutedScope(normalizedSourceId);
      setTotalSources(0);
      setCompletedSources(0);

      const cached = forceRefresh
        ? null
        : getCachedResult(trimmed, normalizedSourceId);
      if (cached) {
        setResult(cached);
        saveSearchState({
          q: trimmed,
          sourceId: normalizedSourceId,
          result: cached,
        });
        setLoading(false);
        setTotalSources(1);
        setCompletedSources(1);
        return;
      }

      setResult(EMPTY_RESULT);

      const currentFluidSearch = readFluidSearchSetting();
      setUseFluidSearch((prev) =>
        prev === currentFluidSearch ? prev : currentFluidSearch
      );

      const params = new URLSearchParams({ q: trimmed });
      if (normalizedSourceId) params.set('sourceId', normalizedSourceId);

      if (currentFluidSearch) {
        const es = new EventSource(`/api/books/search/ws?${params.toString()}`);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
          if (!event.data || currentSearchKeyRef.current !== searchKey) return;
          try {
            const payload = JSON.parse(event.data);
            switch (payload.type) {
              case 'start':
                setTotalSources(payload.totalSources || 0);
                setCompletedSources(0);
                break;
              case 'source_result':
                setCompletedSources((prev) =>
                  Math.max(prev + 1, payload.completedSources || 0)
                );
                if (
                  Array.isArray(payload.results) &&
                  payload.results.length > 0
                ) {
                  appendBufferedResults(payload.results as BookListItem[]);
                }
                break;
              case 'source_error':
                setCompletedSources((prev) =>
                  Math.max(prev + 1, payload.completedSources || 0)
                );
                break;
              case 'error':
                setError(payload.error || '搜索失败');
                setLoading(false);
                closeEventSource();
                break;
              case 'complete': {
                const finalFailedSources: BookSearchResult['failedSources'] =
                  [];
                setCompletedSources(
                  payload.completedSources || payload.totalSources || 0
                );
                if (pendingResultsRef.current.length > 0) {
                  const toAppend = pendingResultsRef.current;
                  pendingResultsRef.current = [];
                  if (flushTimerRef.current) {
                    window.clearTimeout(flushTimerRef.current);
                    flushTimerRef.current = null;
                  }
                  startTransition(() => {
                    setResult((prev) => {
                      const nextResult = {
                        results: prev.results.concat(toAppend),
                        failedSources: finalFailedSources,
                      };
                      setCachedResult(trimmed, normalizedSourceId, nextResult);
                      saveSearchState({
                        q: trimmed,
                        sourceId: normalizedSourceId,
                        result: nextResult,
                      });
                      return nextResult;
                    });
                  });
                } else {
                  setResult((prev) => {
                    const nextResult = {
                      results: prev.results,
                      failedSources: finalFailedSources,
                    };
                    setCachedResult(trimmed, normalizedSourceId, nextResult);
                    saveSearchState({
                      q: trimmed,
                      sourceId: normalizedSourceId,
                      result: nextResult,
                    });
                    return nextResult;
                  });
                }
                setLoading(false);
                closeEventSource();
                break;
              }
            }
          } catch {
            // Ignore malformed streaming payloads.
          }
        };

        es.onerror = () => {
          if (currentSearchKeyRef.current !== searchKey) return;
          if (pendingResultsRef.current.length > 0) {
            const toAppend = pendingResultsRef.current;
            pendingResultsRef.current = [];
            if (flushTimerRef.current) {
              window.clearTimeout(flushTimerRef.current);
              flushTimerRef.current = null;
            }
            startTransition(() => {
              setResult((prev) => ({
                ...prev,
                results: prev.results.concat(toAppend),
              }));
            });
          }
          setLoading(false);
          closeEventSource();
        };
        return;
      }

      try {
        const res = await fetch(`/api/books/search?${params.toString()}`);
        const json = await res.json();
        if (currentSearchKeyRef.current !== searchKey) return;
        if (!res.ok) throw new Error(json.error || '搜索失败');
        const nextResult: BookSearchResult = {
          results: json.results || [],
          failedSources: [],
        };
        setResult(nextResult);
        setTotalSources(1);
        setCompletedSources(1);
        setCachedResult(trimmed, normalizedSourceId, nextResult);
        saveSearchState({
          q: trimmed,
          sourceId: normalizedSourceId,
          result: nextResult,
        });
      } catch (err) {
        if (currentSearchKeyRef.current !== searchKey) return;
        setError((err as Error).message || '搜索失败');
        setResult(EMPTY_RESULT);
      } finally {
        if (currentSearchKeyRef.current === searchKey) {
          setLoading(false);
        }
      }
    },
    [
      appendBufferedResults,
      clearPendingResults,
      closeEventSource,
      getCachedResult,
      readFluidSearchSetting,
      saveSearchState,
      setCachedResult,
    ]
  );

  useEffect(() => {
    setUseFluidSearch(readFluidSearchSetting());
    fetch('/api/books/sources')
      .then((res) => res.json())
      .then((json) => setSources(json.sources || []))
      .catch(() => undefined);
    return () => {
      closeEventSource();
      clearPendingResults();
    };
  }, [clearPendingResults, closeEventSource, readFluidSearchSetting]);

  useEffect(() => {
    const keyword = urlQuery;
    const source = urlSourceId;

    if (!restoredRef.current) {
      restoredRef.current = true;
      if (!keyword) {
        const cachedState = restoreSearchState();
        if (cachedState?.q?.trim()) {
          setQ(cachedState.q);
          setSourceId(cachedState.sourceId || '');
          setResult(cachedState.result || EMPTY_RESULT);
          setHasSearched(true);
          setExecutedScope(cachedState.sourceId || '');
        }
        return;
      }
    }

    setQ(keyword);
    setSourceId(source);
    if (!keyword) {
      closeEventSource();
      clearPendingResults();
      setResult(EMPTY_RESULT);
      setLoading(false);
      setHasSearched(false);
      setExecutedScope('');
      setTotalSources(0);
      setCompletedSources(0);
      setError('');
      return;
    }

    const forceRefresh = forceNextUrlSearchRef.current;
    forceNextUrlSearchRef.current = false;
    void performSearch(keyword, source, { forceRefresh });
  }, [
    clearPendingResults,
    closeEventSource,
    performSearch,
    restoreSearchState,
    urlQuery,
    urlSourceId,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    const params = new URLSearchParams();
    params.set('q', trimmed);
    if (sourceId) params.set('sourceId', sourceId);
    const nextUrl = `/books/search?${params.toString()}`;
    if (urlQuery === trimmed && urlSourceId === sourceId) {
      await performSearch(trimmed, sourceId, { forceRefresh: true });
    } else {
      forceNextUrlSearchRef.current = true;
      router.replace(nextUrl);
    }
  };

  // 书源是单选：选了某一个源时「当前范围」就是它本身，后面再缀一个总源数
  // 只会让人以为这次搜了 2 个源。只有「全部书源」才需要靠数量说明范围多大。
  const scopeLabel = useMemo(() => {
    if (executedScope) {
      return (
        sources.find((source) => source.id === executedScope)?.name ||
        '当前书源'
      );
    }
    if (sources.length === 0) return '全部书源';
    return `全部书源 · ${sources.length} 个书源`;
  }, [executedScope, sources]);

  const searchProgress =
    totalSources > 0
      ? Math.min(100, Math.round((completedSources / totalSources) * 100))
      : 0;

  const submitSearch = useCallback(
    (keyword: string) => {
      const trimmed = keyword.trim();
      if (!trimmed) return;
      const params = new URLSearchParams();
      params.set('q', trimmed);
      if (sourceId) params.set('sourceId', sourceId);
      forceNextUrlSearchRef.current = true;
      router.replace(`/books/search?${params.toString()}`);
    },
    [router, sourceId]
  );

  return (
    <div className='space-y-6'>
      <section className={PANEL_CLASS}>
        <h1
          className={cn('text-2xl font-semibold', LIBRARY_TEXT, LIBRARY_SERIF)}
        >
          搜索电子书
        </h1>
        <p className={cn('mt-2 text-sm', LIBRARY_MUTED)}>
          按书名或作者搜索全部已配置的书源。
        </p>

        <div className='mt-4 flex flex-wrap gap-2'>
          {QUICK_SEARCHES.map((keyword) => (
            <button
              key={keyword}
              type='button'
              onClick={() => {
                setQ(keyword);
                submitSearch(keyword);
              }}
              className={CHIP_CLASS}
            >
              <Search className='h-3.5 w-3.5' />
              {keyword}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className='mt-5'>
          <div className='grid gap-3 lg:grid-cols-[1fr_13rem_auto]'>
            <label className='block'>
              <span
                className={cn('mb-2 block text-xs font-medium', LIBRARY_MUTED)}
              >
                关键词
              </span>
              <div className='relative'>
                <Search
                  className={cn(
                    'pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2',
                    LIBRARY_MUTED
                  )}
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder='搜索书名 / 作者'
                  aria-label='搜索书名或作者'
                  className={`${FIELD_CLASS} pl-11 pr-11`}
                />
                {q ? (
                  <button
                    type='button'
                    onClick={() => setQ('')}
                    className={cn(
                      'absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-library-muted transition-colors duration-200 hover:bg-library-ochre-tint hover:text-library-ochre dark:text-library-night-muted dark:hover:bg-library-night-ochre-tint dark:hover:text-library-night-ochre',
                      LIBRARY_FOCUS
                    )}
                    aria-label='清空搜索关键词'
                  >
                    <X className='h-4 w-4' />
                  </button>
                ) : null}
              </div>
            </label>

            <label className='block'>
              <span
                className={cn('mb-2 block text-xs font-medium', LIBRARY_MUTED)}
              >
                书源
              </span>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                aria-label='选择书源'
                className={`${FIELD_CLASS} cursor-pointer`}
              >
                <option value=''>全部书源</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </label>

            <div className='flex items-end'>
              <button
                type='submit'
                disabled={loading}
                className={cn(
                  LIBRARY_BUTTON,
                  'h-12 w-full cursor-pointer px-6 disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto'
                )}
              >
                {loading ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Search className='h-4 w-4' />
                )}
                {loading ? '搜索中' : '搜索'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className='space-y-4'>
        <MediaSectionHeader
          title={
            hasSearched
              ? `搜索结果${
                  result.results.length > 0
                    ? `（${result.results.length}）`
                    : ''
                }`
              : '等待搜索'
          }
          subtitle={hasSearched ? `当前范围：${scopeLabel}` : undefined}
          action={
            loading && useFluidSearch && totalSources > 0 ? (
              <span className={cn('shrink-0 text-xs', LIBRARY_MUTED)}>
                搜索中 {completedSources}/{totalSources}
              </span>
            ) : undefined
          }
        />

        {loading && useFluidSearch && totalSources > 0 ? (
          <div className={cn(LIBRARY_PROGRESS_TRACK, 'h-1.5')}>
            <div
              className={LIBRARY_PROGRESS_BAR}
              style={{ width: `${searchProgress}%` }}
            />
          </div>
        ) : null}

        {loading && result.results.length === 0 ? (
          <MediaGridSkeleton count={12} />
        ) : null}
        {error ? <EmptyState tone='error' description={error} /> : null}

        {result.results.length > 0 ? (
          <MediaGrid>
            {result.results.map((item) => (
              <MediaCard
                key={`${item.sourceId}-${item.id}`}
                item={bookCardItem(item)}
                href={detailHref(item)}
                onNavigate={() => cacheBookListItem(item)}
              />
            ))}
          </MediaGrid>
        ) : null}

        {!loading && hasSearched && !error && result.results.length === 0 ? (
          <EmptyState
            icon={<Search className='h-7 w-7' />}
            title='没有找到匹配书籍'
            description='试试更短的关键词、作者名，或切换到全部书源重新搜索。'
            action={QUICK_SEARCHES.map((keyword) => (
              <button
                key={keyword}
                type='button'
                onClick={() => {
                  setQ(keyword);
                  submitSearch(keyword);
                }}
                className={CHIP_CLASS}
              >
                搜索 {keyword}
              </button>
            ))}
          />
        ) : null}
      </section>
    </div>
  );
}
