'use client';

import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { cn } from '@/lib/cn';
import {
  deleteMangaShelf,
  getAllMangaShelf,
  saveMangaShelf,
} from '@/lib/db.client';
import {
  MangaSearchItem,
  MangaShelfItem,
  MangaSource,
} from '@/lib/manga.types';

import {
  mangaCardItem,
  mangaItemDetailHref,
} from '@/components/media/adapters';
import EmptyState from '@/components/media/EmptyState';
import {
  LIBRARY_BUTTON,
  LIBRARY_FIELD,
  LIBRARY_MUTED,
  LIBRARY_PANEL,
} from '@/components/media/library';
import MediaCard from '@/components/media/MediaCard';
import MediaGrid from '@/components/media/MediaGrid';
import MediaGridSkeleton from '@/components/media/MediaGridSkeleton';
import MediaSectionHeader from '@/components/media/MediaSectionHeader';
import ShelfChipButton from '@/components/media/ShelfChipButton';

const MANGA_SEARCH_STATE_KEY = 'manga_search_state';

export default function MangaSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q')?.trim() || '';
  const urlSourceId = searchParams.get('sourceId') || '';

  const [query, setQuery] = useState('');
  const [sources, setSources] = useState<MangaSource[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [results, setResults] = useState<MangaSearchItem[]>([]);
  const [shelf, setShelf] = useState<Record<string, MangaShelfItem>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [lastSearchedSourceId, setLastSearchedSourceId] = useState('');
  const restoredRef = useRef(false);
  const forceNextUrlSearchRef = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const currentSearchKeyRef = useRef('');
  const pendingResultsRef = useRef<MangaSearchItem[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const [totalSources, setTotalSources] = useState(0);
  const [completedSources, setCompletedSources] = useState(0);
  const [useFluidSearch, setUseFluidSearch] = useState(true);

  const getCacheKey = useCallback(
    (keyword: string, selectedSourceId: string) => {
      return `manga_search_cache_${
        selectedSourceId || 'all'
      }_${keyword.trim()}`;
    },
    []
  );

  const getCachedResults = useCallback(
    (keyword: string, selectedSourceId: string) => {
      if (typeof window === 'undefined' || !keyword.trim()) return null;
      try {
        const cached = sessionStorage.getItem(
          getCacheKey(keyword, selectedSourceId)
        );
        return cached ? (JSON.parse(cached) as MangaSearchItem[]) : null;
      } catch {
        return null;
      }
    },
    [getCacheKey]
  );

  const setCachedResults = useCallback(
    (
      keyword: string,
      selectedSourceId: string,
      nextResults: MangaSearchItem[]
    ) => {
      if (typeof window === 'undefined' || !keyword.trim()) return;
      try {
        sessionStorage.setItem(
          getCacheKey(keyword, selectedSourceId),
          JSON.stringify(nextResults)
        );
      } catch {
        // ignore session cache failures
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
      // ignore invalid localStorage values
    }
    return (
      (window as Window & { RUNTIME_CONFIG?: { FLUID_SEARCH?: boolean } })
        .RUNTIME_CONFIG?.FLUID_SEARCH !== false
    );
  }, []);

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch {
        // ignore close failures
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

  const appendBufferedResults = useCallback(
    (nextResults: MangaSearchItem[]) => {
      if (nextResults.length === 0) return;
      pendingResultsRef.current.push(...nextResults);
      if (!flushTimerRef.current) {
        flushTimerRef.current = window.setTimeout(() => {
          const toAppend = pendingResultsRef.current;
          pendingResultsRef.current = [];
          startTransition(() => {
            setResults((prev) => prev.concat(toAppend));
          });
          flushTimerRef.current = null;
        }, 80);
      }
    },
    []
  );

  const saveSearchState = useCallback(
    (nextState: {
      query: string;
      sourceId: string;
      results: MangaSearchItem[];
    }) => {
      if (typeof window === 'undefined') return;
      try {
        sessionStorage.setItem(
          MANGA_SEARCH_STATE_KEY,
          JSON.stringify(nextState)
        );
      } catch {
        // ignore session cache failures
      }
    },
    []
  );

  const restoreSearchState = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = sessionStorage.getItem(MANGA_SEARCH_STATE_KEY);
      return cached
        ? (JSON.parse(cached) as {
            query: string;
            sourceId: string;
            results: MangaSearchItem[];
          })
        : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    setUseFluidSearch(readFluidSearchSetting());

    fetch('/api/manga/sources')
      .then((res) => res.json())
      .then((data) => setSources(data.sources || []))
      .catch(() => undefined);

    getAllMangaShelf()
      .then(setShelf)
      .catch(() => undefined);

    return () => {
      closeEventSource();
      clearPendingResults();
    };
  }, [clearPendingResults, closeEventSource, readFluidSearchSetting]);

  const performSearch = useCallback(
    async (
      keyword: string,
      selectedSourceId: string,
      options?: { forceRefresh?: boolean }
    ) => {
      const trimmedQuery = keyword.trim();
      if (!trimmedQuery) return;
      const normalizedSourceId = selectedSourceId || '';
      const searchKey = `${normalizedSourceId}::${trimmedQuery}`;
      const forceRefresh = options?.forceRefresh === true;

      closeEventSource();
      clearPendingResults();
      currentSearchKeyRef.current = searchKey;

      setLoading(true);
      setError('');
      setHasSearched(true);
      setLastSearchedQuery(trimmedQuery);
      setLastSearchedSourceId(normalizedSourceId);
      setTotalSources(0);
      setCompletedSources(0);

      const cached = forceRefresh
        ? null
        : getCachedResults(trimmedQuery, normalizedSourceId);
      if (cached) {
        setResults(cached);
        saveSearchState({
          query: trimmedQuery,
          sourceId: normalizedSourceId,
          results: cached,
        });
        setLoading(false);
        setTotalSources(1);
        setCompletedSources(1);
        return;
      }

      setResults([]);

      const currentFluidSearch = readFluidSearchSetting();
      setUseFluidSearch((prev) =>
        prev === currentFluidSearch ? prev : currentFluidSearch
      );

      const params = new URLSearchParams({ q: trimmedQuery });
      if (normalizedSourceId) params.set('sourceId', normalizedSourceId);

      if (currentFluidSearch) {
        const es = new EventSource(`/api/manga/search/ws?${params.toString()}`);
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
                  appendBufferedResults(payload.results as MangaSearchItem[]);
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
                    setResults((prev) => {
                      const nextResults = prev.concat(toAppend);
                      setCachedResults(
                        trimmedQuery,
                        normalizedSourceId,
                        nextResults
                      );
                      saveSearchState({
                        query: trimmedQuery,
                        sourceId: normalizedSourceId,
                        results: nextResults,
                      });
                      return nextResults;
                    });
                  });
                } else {
                  setResults((prev) => {
                    setCachedResults(trimmedQuery, normalizedSourceId, prev);
                    saveSearchState({
                      query: trimmedQuery,
                      sourceId: normalizedSourceId,
                      results: prev,
                    });
                    return prev;
                  });
                }
                setLoading(false);
                closeEventSource();
                break;
              }
            }
          } catch {
            // ignore malformed SSE payloads
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
              setResults((prev) => prev.concat(toAppend));
            });
          }
          setLoading(false);
          closeEventSource();
        };
        return;
      }

      try {
        const res = await fetch(`/api/manga/search?${params.toString()}`);
        const data = await res.json();
        if (currentSearchKeyRef.current !== searchKey) return;
        if (!res.ok) throw new Error(data.error || '搜索失败');
        const nextResults = data.results || [];
        setResults(nextResults);
        setTotalSources(1);
        setCompletedSources(1);
        setCachedResults(trimmedQuery, normalizedSourceId, nextResults);
        saveSearchState({
          query: trimmedQuery,
          sourceId: normalizedSourceId,
          results: nextResults,
        });
      } catch (err) {
        if (currentSearchKeyRef.current !== searchKey) return;
        setError((err as Error).message);
        setResults([]);
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
      getCachedResults,
      readFluidSearchSetting,
      saveSearchState,
      setCachedResults,
    ]
  );

  useEffect(() => {
    if (!restoredRef.current) {
      restoredRef.current = true;

      if (!urlQuery) {
        const cachedState = restoreSearchState();
        if (cachedState?.query?.trim()) {
          setQuery(cachedState.query);
          setSourceId(cachedState.sourceId || '');
          setResults(cachedState.results || []);
          setHasSearched(true);
          setLastSearchedQuery(cachedState.query);
          setLastSearchedSourceId(cachedState.sourceId || '');
        }
        return;
      }
    }

    setQuery(urlQuery);
    setSourceId(urlSourceId);

    if (!urlQuery) {
      closeEventSource();
      clearPendingResults();
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      setLastSearchedQuery('');
      setLastSearchedSourceId('');
      setTotalSources(0);
      setCompletedSources(0);
      setError('');
      return;
    }

    const forceRefresh = forceNextUrlSearchRef.current;
    forceNextUrlSearchRef.current = false;
    void performSearch(urlQuery, urlSourceId, { forceRefresh });
  }, [
    clearPendingResults,
    closeEventSource,
    performSearch,
    restoreSearchState,
    urlQuery,
    urlSourceId,
  ]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const params = new URLSearchParams({ q: trimmedQuery });
    if (sourceId) params.set('sourceId', sourceId);
    const nextUrl = `/manga/search?${params.toString()}`;
    if (urlQuery === trimmedQuery && urlSourceId === sourceId) {
      await performSearch(trimmedQuery, sourceId, { forceRefresh: true });
    } else {
      forceNextUrlSearchRef.current = true;
      router.replace(nextUrl);
    }
  };

  const returnTo = useMemo(() => {
    const params = new URLSearchParams();
    if (lastSearchedQuery) params.set('q', lastSearchedQuery);
    if (lastSearchedSourceId) params.set('sourceId', lastSearchedSourceId);
    const queryString = params.toString();
    return queryString ? `/manga/search?${queryString}` : '/manga/search';
  }, [lastSearchedQuery, lastSearchedSourceId]);

  const toggleShelf = async (item: MangaSearchItem) => {
    const key = `${item.sourceId}+${item.id}`;
    if (shelf[key]) {
      await deleteMangaShelf(item.sourceId, item.id);
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
      mangaId: item.id,
      saveTime: Date.now(),
      description: item.description,
      author: item.author,
      status: item.status,
    };
    await saveMangaShelf(item.sourceId, item.id, shelfItem);
    setShelf((prev) => ({ ...prev, [key]: shelfItem }));
  };

  return (
    <div className='space-y-6'>
      {/* 搜索框做成纸面书案的样式：一个实心纸面板托着输入、来源与搜索键。 */}
      <form
        className={cn(LIBRARY_PANEL, 'mx-auto max-w-4xl p-3 sm:p-4')}
        onSubmit={handleSearch}
      >
        <div className='flex flex-col gap-3 lg:flex-row'>
          <div className='flex-1'>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='搜索漫画标题'
              aria-label='搜索漫画标题'
              className={LIBRARY_FIELD}
            />
          </div>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            aria-label='选择漫画来源'
            className={cn(LIBRARY_FIELD, 'cursor-pointer lg:w-56')}
          >
            <option value=''>全部来源</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.displayName || source.name}
              </option>
            ))}
          </select>
          <button className={cn(LIBRARY_BUTTON, 'lg:w-32')}>
            <Search className='h-4 w-4' /> 搜索
          </button>
        </div>
      </form>

      <section className='space-y-4'>
        <MediaSectionHeader
          title={`搜索结果${results.length > 0 ? `（${results.length}）` : ''}`}
          action={
            loading && useFluidSearch && totalSources > 0 ? (
              <span className={cn('shrink-0 text-xs', LIBRARY_MUTED)}>
                搜索中 {completedSources}/{totalSources}
              </span>
            ) : undefined
          }
        />
        {error && <EmptyState tone='error' description={error} />}
        {loading && results.length === 0 ? (
          <MediaGridSkeleton count={12} />
        ) : results.length === 0 ? (
          <EmptyState
            icon={<Search className='h-7 w-7' />}
            title={hasSearched ? '没有找到相关漫画' : '还没有开始搜索'}
            description={
              hasSearched
                ? '试试更短的关键词，或把来源切到「全部来源」。'
                : '在上面的输入框里输入标题，或直接回车搜索全部漫画源。'
            }
          />
        ) : (
          <MediaGrid>
            {results.map((item) => {
              const key = `${item.sourceId}+${item.id}`;
              return (
                <MediaCard
                  key={key}
                  item={{
                    ...mangaCardItem(item),
                    subtitle: item.author || item.status || item.description,
                  }}
                  href={mangaItemDetailHref(item, returnTo)}
                  overlayAction={
                    <ShelfChipButton
                      active={Boolean(shelf[key])}
                      onClick={() => toggleShelf(item)}
                    />
                  }
                />
              );
            })}
          </MediaGrid>
        )}
      </section>
    </div>
  );
}
