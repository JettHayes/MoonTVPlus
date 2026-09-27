'use client';

import { Play, RefreshCw, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import CoverCard from '@/components/music/CoverCard';
import MusicEmpty, {
  MusicCardGridSkeleton,
  MusicRowListSkeleton,
} from '@/components/music/MusicEmpty';
import MusicLoadingIndicator from '@/components/music/MusicLoadingIndicator';
import MusicPage from '@/components/music/MusicPage';
import MusicSwitch from '@/components/music/MusicSwitch';
import SongList from '@/components/music/SongList';
import {
  MUSIC_BUTTON,
  MUSIC_COUNT,
  MUSIC_COVER_GRID,
  MUSIC_FIELD,
  MUSIC_FIELD_INPUT,
  MUSIC_HOT_GRID,
  MUSIC_HOT_ITEM,
  MUSIC_HOT_RANK,
  MUSIC_HOT_RANK_TOP,
  MUSIC_HOT_WORD,
  MUSIC_ICON_BUTTON,
  MUSIC_LABEL,
  MUSIC_MUTED,
  MUSIC_SINGER,
  MUSIC_SINGER_ALIAS,
  MUSIC_SINGER_FRAME,
  MUSIC_SINGER_GRID,
  MUSIC_SINGER_META,
  MUSIC_SINGER_NAME,
  MUSIC_SINGER_PIC,
} from '@/components/music/tokens';
import { cn } from '@/lib/cn';
import { playMusicList } from '@/lib/music/actions';
import { mapSong, musicSources, normalizeSource } from '@/lib/music/shared';
import type { Song } from '@/lib/music/types';

type HotSearchItem = { keyword: string; artist?: string };
type SearchType = 'song' | 'singer' | 'album';
type SingerResult = {
  id: string | number;
  mid?: string;
  name: string;
  picUrl?: string;
  alias?: string[];
  albumSize?: number;
  source?: string;
};
type AlbumResult = {
  id: string | number;
  mid?: string;
  name: string;
  picUrl?: string;
  artistName?: string;
  size?: number;
  publishTime?: string | number;
  source?: string;
};

const HOT_SEARCH_CACHE_DURATION = 60 * 60 * 1000;
const HOT_SEARCH_LIMIT = 20;

/**
 * 搜索类型。标识方块用"曲 / 唱 / 碟"三个不同的字——两字母缩写在这里不成立
 * （歌曲和歌手都是 S 打头），而这三个字本身就说清楚了搜的是什么。
 */
const searchTypeOptions: Array<{ key: SearchType; label: string; monogram: string }> = [
  { key: 'song', label: '歌曲', monogram: '曲' },
  { key: 'singer', label: '歌手', monogram: '唱' },
  { key: 'album', label: '专辑', monogram: '碟' },
];

const sourceOptions = musicSources.map((item) => ({
  key: item.key,
  label: item.label,
  monogram: item.monogram,
}));

/** 歌手和专辑只有这两个音源有搜。少了就在这个列表里报，省得用户空搜一趟。 */
const DETAIL_SEARCH_SOURCES = ['wy', 'tx'];

function getHotSearchCacheKey(source: string) {
  return `music_hot_search_${source}`;
}

function formatPublishTime(value?: string | number) {
  if (!value) return '';
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
}

function SingerGrid({
  singers,
  onOpen,
}: {
  singers: SingerResult[];
  onOpen: (singer: SingerResult) => void;
}) {
  if (singers.length === 0) {
    return (
      <MusicEmpty
        title='没有匹配的歌手'
        hint='换个写法，或者把音源切到网易云 / QQ 再试。'
      />
    );
  }

  return (
    <div className={MUSIC_SINGER_GRID}>
      {singers.map((singer, index) => (
        <button
          key={`${singer.source || 'wy'}-${singer.id}-${index}`}
          type='button'
          onClick={() => onOpen(singer)}
          className={MUSIC_SINGER}
        >
          <span className={MUSIC_SINGER_FRAME}>
            {singer.picUrl ? (
              <img
                src={singer.picUrl}
                alt=''
                loading='lazy'
                referrerPolicy='no-referrer'
                className={MUSIC_SINGER_PIC}
              />
            ) : (
              <span className='flex h-full w-full items-center justify-center font-music-display text-[calc(22*var(--music-px))] text-music-muted/60 dark:text-music-night-muted/60'>
                {singer.name.slice(0, 1)}
              </span>
            )}
          </span>
          <span className={cn(MUSIC_SINGER_NAME, 'block')} title={singer.name}>
            {singer.name}
          </span>
          {singer.alias?.[0] ? (
            <span className={cn(MUSIC_SINGER_ALIAS, 'block')}>{singer.alias[0]}</span>
          ) : null}
          <span className={MUSIC_SINGER_META}>{singer.albumSize || 0} 张专辑</span>
        </button>
      ))}
    </div>
  );
}

function AlbumGrid({
  albums,
  onOpen,
}: {
  albums: AlbumResult[];
  onOpen: (album: AlbumResult) => void;
}) {
  if (albums.length === 0) {
    return (
      <MusicEmpty
        title='没有匹配的专辑'
        hint='换个写法，或者把音源切到网易云 / QQ 再试。'
      />
    );
  }

  return (
    <div className={MUSIC_COVER_GRID}>
      {albums.map((album, index) => (
        <CoverCard
          key={`${album.source || 'wy'}-${album.id}-${index}`}
          name={album.name}
          cover={album.picUrl}
          sub={album.artistName || '未知歌手'}
          meta={formatPublishTime(album.publishTime)}
          onOpen={() => onOpen(album)}
        />
      ))}
    </div>
  );
}

export default function MusicSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = normalizeSource(searchParams.get('source'));
  const q = searchParams.get('q') || '';
  const searchType = (['song', 'singer', 'album'].includes(searchParams.get('type') || '')
    ? searchParams.get('type')
    : 'song') as SearchType;
  const [keyword, setKeyword] = useState(q);
  const [selectedSource, setSelectedSource] = useState(source);
  const [selectedType, setSelectedType] = useState<SearchType>(searchType);
  const [songs, setSongs] = useState<Song[]>([]);
  const [singers, setSingers] = useState<SingerResult[]>([]);
  const [albums, setAlbums] = useState<AlbumResult[]>([]);
  const [hotSearches, setHotSearches] = useState<HotSearchItem[]>([]);
  // 热搜挂载即拉，初值给 true 才不会先闪一帧"取不到热搜"。
  const [hotLoading, setHotLoading] = useState(true);
  // 初值跟着 q 走：带 ?q= 进来的（分享链接、刷新）挂载本就会搜一次，给死 false 的话
  // 首帧会先渲染成"没有搜到「xxx」"再跳成骨架——明明有结果。不带 q 时是 false，
  // 首屏直接是热搜面板，不会闪一下骨架。
  const [loading, setLoading] = useState(!!q);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');
  const loadingMoreRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const userScrolledRef = useRef(false);

  const loadHotSearch = async (forceRefresh = false) => {
    const cacheKey = getHotSearchCacheKey(source);
    let cachedData: HotSearchItem[] | null = null;
    let cacheExpired = true;

    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Array.isArray(data)) {
            cachedData = data;
            cacheExpired = Date.now() - Number(timestamp || 0) > HOT_SEARCH_CACHE_DURATION;
          }
        }
      } catch {
        cachedData = null;
      }
    }

    if (cachedData) {
      setHotSearches(cachedData);
      setHotLoading(false);
    } else {
      setHotSearches([]);
      setHotLoading(true);
    }

    if (!cachedData || cacheExpired || forceRefresh) {
      try {
        const res = await fetch(`/api/music/v2/discovery/hot-search?source=${source}`);
        const data = await res.json();
        if (data.success) {
          const nextHotSearches = (data.data?.list || []).slice(0, HOT_SEARCH_LIMIT);
          setHotSearches(nextHotSearches);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ data: nextHotSearches, timestamp: Date.now() }));
          } catch {
            // ignore cache write failure
          }
        } else if (!cachedData) {
          setHotSearches([]);
        }
      } catch {
        if (!cachedData) setHotSearches([]);
      } finally {
        setHotLoading(false);
      }
    }
  };

  const loadSearchPage = useCallback(async (pageNum: number, append = false, signal?: AbortSignal) => {
    if (!q) return;
    if (append) {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch(`/api/music/v2/search?source=${source}&q=${encodeURIComponent(q)}&type=${searchType}&page=${pageNum}&limit=20`, { signal });
      const data = await res.json();
      const list = data.data?.list || [];
      const nextHasMore = Boolean(data.data?.hasMore);

      if (searchType === 'singer') {
        setSingers((prev) => append ? [...prev, ...list] : list);
        if (!append) {
          setAlbums([]);
          setSongs([]);
        }
      } else if (searchType === 'album') {
        setAlbums((prev) => append ? [...prev, ...list] : list);
        if (!append) {
          setSingers([]);
          setSongs([]);
        }
      } else {
        const nextSongs = list.map(mapSong);
        setSongs((prev) => append ? [...prev, ...nextSongs] : nextSongs);
        if (!append) {
          setSingers([]);
          setAlbums([]);
        }
      }

      setPage(pageNum);
      setHasMore(nextHasMore);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        if (!append) {
          setSongs([]);
          setSingers([]);
          setAlbums([]);
          setHasMore(false);
        }
      }
    } finally {
      if (append) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [source, q, searchType]);

  useEffect(() => {
    setSelectedSource(source);
    setSelectedType(searchType);
    setKeyword(q);
    void loadHotSearch();

    if (!q) {
      setSongs([]);
      setSingers([]);
      setAlbums([]);
      setDetailTitle('');
      setPage(1);
      setHasMore(false);
      return;
    }
    const controller = new AbortController();
    setDetailTitle('');
    setPage(1);
    void loadSearchPage(1, false, controller.signal);
    return () => controller.abort();
  }, [source, q, searchType, loadSearchPage]);

  useEffect(() => {
    userScrolledRef.current = false;
  }, [source, q, searchType]);

  useEffect(() => {
    if (!q || detailTitle || !hasMore) return;
    const target = loadMoreRef.current;
    if (!target) return;

    const markUserScrolled = () => {
      userScrolledRef.current = true;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!userScrolledRef.current) return;
        if (loading || loadingMore || loadingMoreRef.current) return;
        void loadSearchPage(page + 1, true);
      },
      { root: null, rootMargin: '0px 0px 80px 0px', threshold: 0.1 }
    );

    window.addEventListener('wheel', markUserScrolled, { passive: true });
    window.addEventListener('touchmove', markUserScrolled, { passive: true });
    window.addEventListener('scroll', markUserScrolled, { passive: true });
    observer.observe(target);

    return () => {
      observer.disconnect();
      window.removeEventListener('wheel', markUserScrolled);
      window.removeEventListener('touchmove', markUserScrolled);
      window.removeEventListener('scroll', markUserScrolled);
    };
  }, [q, detailTitle, hasMore, loading, loadingMore, page, loadSearchPage]);

  const submit = () => {
    const next = keyword.trim();
    if (next) router.push(`/music/search?source=${selectedSource}&type=${selectedType}&q=${encodeURIComponent(next)}`);
  };

  const changeSource = (nextSource: string) => {
    let normalizedSource = normalizeSource(nextSource);
    if ((selectedType === 'singer' || selectedType === 'album') && !DETAIL_SEARCH_SOURCES.includes(normalizedSource)) {
      normalizedSource = 'wy';
    }
    const next = keyword.trim() || q;
    setSelectedSource(normalizedSource);
    router.push(`/music/search?source=${normalizedSource}&type=${selectedType}${next ? `&q=${encodeURIComponent(next)}` : ''}`);
  };

  const changeType = (nextType: SearchType) => {
    let nextSource = selectedSource;
    if ((nextType === 'singer' || nextType === 'album') && !DETAIL_SEARCH_SOURCES.includes(nextSource)) {
      nextSource = 'wy';
      setSelectedSource(nextSource);
    }
    const next = keyword.trim() || q;
    setSelectedType(nextType);
    if (next) {
      setLoading(true);
      if (nextType === 'song') {
        setSingers([]);
        setAlbums([]);
      } else if (nextType === 'singer') {
        setSongs([]);
        setAlbums([]);
      } else {
        setSongs([]);
        setSingers([]);
      }
    }
    router.push(`/music/search?source=${nextSource}&type=${nextType}${next ? `&q=${encodeURIComponent(next)}` : ''}`);
  };

  const openSinger = async (singer: SingerResult) => {
    setDetailTitle(`${singer.name} · 热门歌曲`);
    setSingers([]);
    setAlbums([]);
    setSongs([]);
    setHasMore(false);
    setLoading(true);
    try {
      const itemSource = normalizeSource(singer.source || selectedSource);
      const res = await fetch(`/api/music/v2/discovery/artist-songs?source=${itemSource}&id=${encodeURIComponent(String(singer.id))}`);
      const data = await res.json();
      const nextSongs = (data.data?.list || []).map(mapSong);
      setSongs(nextSongs);
    } catch {
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  const openAlbum = async (album: AlbumResult) => {
    setDetailTitle(album.name);
    setSingers([]);
    setAlbums([]);
    setSongs([]);
    setHasMore(false);
    setLoading(true);
    try {
      const itemSource = normalizeSource(album.source || selectedSource);
      const res = await fetch(`/api/music/v2/discovery/album-songs?source=${itemSource}&id=${encodeURIComponent(String(album.id))}`);
      const data = await res.json();
      const nextSongs = (data.data?.list || []).map(mapSong);
      setSongs(nextSongs);
    } catch {
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  const currentSourceLabel = musicSources.find((item) => item.key === selectedSource)?.label || '音源';
  const currentTypeLabel = searchTypeOptions.find((item) => item.key === selectedType)?.label || '歌曲';
  const resultCount = selectedType === 'song' ? songs.length : selectedType === 'singer' ? singers.length : albums.length;
  const resultUnit = selectedType === 'song' ? '首' : selectedType === 'singer' ? '位' : '张';

  const title = detailTitle || q || '发现音乐';
  const subtitle = q
    ? `${detailTitle ? '歌曲' : '搜索'} · ${currentSourceLabel} · ${currentTypeLabel}`
    : `热门搜索 · ${currentSourceLabel}`;

  const showPlayAll = selectedType === 'song' || Boolean(detailTitle);

  return (
    <MusicPage
      title={title}
      subtitle={subtitle}
      actions={
        <>
          {resultCount > 0 ? (
            <span className={MUSIC_COUNT}>
              {resultCount} {resultUnit}
            </span>
          ) : null}
          <MusicSwitch
            field='音源'
            value={selectedSource}
            options={sourceOptions}
            onChange={changeSource}
          />
          <MusicSwitch
            field='类型'
            value={selectedType}
            options={searchTypeOptions}
            onChange={changeType}
          />
          {showPlayAll ? (
            <button
              type='button'
              onClick={() => playMusicList(songs, q ? `搜索: ${q}` : '搜索结果')}
              disabled={songs.length === 0}
              className={MUSIC_BUTTON}
            >
              <Play className='h-3.5 w-3.5' strokeWidth={2.2} />
              播放全部
            </button>
          ) : null}
        </>
      }
    >
      {/* 搜索框单独占一行：它和右边的两个下拉各自都要够宽才不至于被压变形，
          挤在同一行里三样都会变小。用 form 而不是 onKeyDown，手机键盘上才有"前往"。 */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className={cn(MUSIC_FIELD, 'mb-6')}
      >
        <Search
          className='h-4 w-4 shrink-0 text-music-muted dark:text-music-night-muted'
          strokeWidth={2}
        />
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          className={MUSIC_FIELD_INPUT}
          placeholder='搜索歌曲、歌手或专辑…'
          aria-label='搜索'
        />
      </form>

      {loading ? (
        selectedType === 'song' || detailTitle ? (
          <MusicRowListSkeleton count={8} />
        ) : (
          <MusicCardGridSkeleton count={10} />
        )
      ) : q ? (
        selectedType === 'singer' ? (
          detailTitle ? (
            <SongList songs={songs} />
          ) : (
            <SingerGrid singers={singers} onOpen={openSinger} />
          )
        ) : selectedType === 'album' ? (
          detailTitle ? (
            <SongList songs={songs} />
          ) : (
            <AlbumGrid albums={albums} onOpen={openAlbum} />
          )
        ) : songs.length > 0 ? (
          <SongList songs={songs} />
        ) : (
          <MusicEmpty title={`没有搜到「${q}」`} hint='换个写法，或者切一个音源再试。' />
        )
      ) : (
        <div>
          <div className='mb-2 flex items-center justify-between gap-3'>
            <span className={MUSIC_LABEL}>热门搜索 · {currentSourceLabel}</span>
            <button
              type='button'
              onClick={() => void loadHotSearch(true)}
              disabled={hotLoading}
              aria-label='刷新热搜'
              title='刷新热搜'
              className={MUSIC_ICON_BUTTON}
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', hotLoading && 'animate-spin motion-reduce:animate-none')}
                strokeWidth={2}
              />
            </button>
          </div>

          {hotLoading ? (
            <MusicLoadingIndicator className='py-10' />
          ) : hotSearches.length > 0 ? (
            <div className={MUSIC_HOT_GRID}>
              {hotSearches.map((item, index) => (
                <button
                  key={`${item.keyword}-${index}`}
                  type='button'
                  onClick={() => {
                    setKeyword(item.keyword);
                    router.push(`/music/search?source=${source}&type=${selectedType}&q=${encodeURIComponent(item.keyword)}`);
                  }}
                  className={MUSIC_HOT_ITEM}
                >
                  <span className={cn(MUSIC_HOT_RANK, index < 3 && MUSIC_HOT_RANK_TOP)}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={MUSIC_HOT_WORD}>{item.keyword}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className={cn(MUSIC_MUTED, 'py-10 text-center font-music-body text-[calc(12*var(--music-px))]')}>
              当前音源无法获取热搜
            </p>
          )}
        </div>
      )}

      {loadingMore ? <MusicRowListSkeleton count={4} /> : null}
      {q && !detailTitle && hasMore ? <div ref={loadMoreRef} className='h-1' /> : null}
    </MusicPage>
  );
}
