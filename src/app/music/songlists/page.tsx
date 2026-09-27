'use client';

import { ChevronDown, Disc3 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import CoverCard from '@/components/music/CoverCard';
import MusicEmpty, { MusicCardGridSkeleton } from '@/components/music/MusicEmpty';
import MusicPage from '@/components/music/MusicPage';
import MusicSwitch from '@/components/music/MusicSwitch';
import {
  MUSIC_COVER_GRID,
  MUSIC_GHOST_BUTTON,
  MUSIC_LABEL,
  MUSIC_MUTED,
  MUSIC_PAGER,
  MUSIC_PAGER_TEXT,
  MUSIC_SEG,
  MUSIC_SEG_ITEM,
  MUSIC_SEG_ITEM_ACTIVE,
  MUSIC_SEG_ITEM_IDLE,
  MUSIC_SWITCH,
  MUSIC_SWITCH_CARET,
  MUSIC_SWITCH_KEY,
  MUSIC_SWITCH_VALUE,
  MUSIC_TAG,
  MUSIC_TAG_ACTIVE,
  MUSIC_TAG_GROUP,
  MUSIC_TAG_GROUP_LABEL,
  MUSIC_TAG_IDLE,
  MUSIC_TAG_WRAP,
} from '@/components/music/tokens';
import { cn } from '@/lib/cn';
import { musicSources, normalizeSource } from '@/lib/music/shared';

interface SongListItem {
  id: string;
  name: string;
  pic?: string;
  source: string;
  author?: string;
  desc?: string;
  play_count?: string | number;
  total?: number;
  updateFrequency?: string;
}

interface SongListTag {
  id: string;
  name: string;
}

interface SongListGroup {
  name: string;
  list: SongListTag[];
}

const sortOptions = [
  { id: 'hot', label: '最热' },
  { id: 'new', label: '最新' },
];

const sourceOptions = musicSources.map((item) => ({
  key: item.key,
  label: item.label,
  monogram: item.monogram,
}));

const SONGLIST_CACHE_TTL = 60 * 60 * 1000;

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - Number(cached.timestamp || 0) > SONGLIST_CACHE_TTL) return null;
    return cached.data as T;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // ignore cache write failure
  }
}

export default function MusicSongListsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = normalizeSource(searchParams.get('source'));
  const tagId = searchParams.get('tagId') || '';
  const sortId = searchParams.get('sortId') || 'hot';
  const page = Number(searchParams.get('page') || '1');

  const [showTagMenu, setShowTagMenu] = useState(false);
  const [groups, setGroups] = useState<SongListGroup[]>([]);
  const [hotTags, setHotTags] = useState<SongListTag[]>([]);
  const [songLists, setSongLists] = useState<SongListItem[]>([]);
  // 两个初值都给 true，理由同 rankings 页：挂载即发请求，false 会先闪一帧空态。
  const [loadingTags, setLoadingTags] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [total, setTotal] = useState(0);
  const [activeTagLabel, setActiveTagLabel] = useState(tagId);
  const [activeSource, setActiveSource] = useState(source);
  const [activeSortId, setActiveSortId] = useState(sortId);

  const currentSourceLabel = musicSources.find((item) => item.key === activeSource)?.label || '音源';

  const updateQuery = (next: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === '') params.delete(key);
      else params.set(key, String(value));
    });
    if ('source' in next) {
      setGroups([]);
      setHotTags([]);
      setSongLists([]);
      setLoadingTags(true);
      setLoadingList(true);
    } else if ('tagId' in next || 'sortId' in next || 'page' in next) {
      setSongLists([]);
      setLoadingList(true);
    }
    router.push(`/music/songlists?${params.toString()}`);
  };

  useEffect(() => {
    setActiveTagLabel(tagId);
  }, [tagId]);

  useEffect(() => {
    setActiveSource(source);
  }, [source]);

  useEffect(() => {
    setActiveSortId(sortId);
  }, [sortId]);

  // 分类面板是点击开合的（原来是 hover 开）。hover 在触屏上等于没有，
  // 而且鼠标从触发器挪到面板的路上会闪一下关掉。
  useEffect(() => {
    if (!showTagMenu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowTagMenu(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showTagMenu]);

  useEffect(() => {
    const cacheKey = `music_songlist_tags_${source}`;
    const cached = readCache<{ groups: SongListGroup[]; hotTags: SongListTag[] }>(cacheKey);
    setLoadingTags(true);
    if (cached) {
      setGroups(cached.groups || []);
      setHotTags(cached.hotTags || []);
    }

    fetch(`/api/music/v2/discovery/songlist-tags?source=${source}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const next = {
            groups: data.data?.groups || [],
            hotTags: data.data?.hotTags || [],
          };
          setGroups(next.groups);
          setHotTags(next.hotTags);
          writeCache(cacheKey, next);
        } else if (!cached) {
          setGroups([]);
          setHotTags([]);
        }
      })
      .catch(() => {
        if (!cached) {
          setGroups([]);
          setHotTags([]);
        }
      })
      .finally(() => setLoadingTags(false));
  }, [source]);

  useEffect(() => {
    const cacheKey = `music_songlists_${source}_${tagId}_${sortId}_${page}`;
    const cached = readCache<{ list: SongListItem[]; total: number }>(cacheKey);
    setLoadingList(true);
    if (cached) {
      setSongLists(cached.list || []);
      setTotal(cached.total || 0);
    }

    fetch(`/api/music/v2/discovery/songlists?source=${source}&tagId=${encodeURIComponent(tagId)}&sortId=${encodeURIComponent(sortId)}&page=${page}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const next = {
            list: data.data?.list || [],
            total: data.data?.total || 0,
          };
          setSongLists(next.list);
          setTotal(next.total);
          writeCache(cacheKey, next);
        } else if (!cached) {
          setSongLists([]);
          setTotal(0);
        }
      })
      .catch(() => {
        if (!cached) {
          setSongLists([]);
          setTotal(0);
        }
      })
      .finally(() => setLoadingList(false));
  }, [source, tagId, sortId, page]);

  const openDetail = (item: SongListItem) => {
    router.push(`/music/songlists/${item.source}/${encodeURIComponent(item.id)}?name=${encodeURIComponent(item.name)}`);
  };

  const selectTag = (name: string) => {
    setActiveTagLabel(name);
    setShowTagMenu(false);
    updateQuery({ tagId: name, page: 1 });
  };

  const flatTags = hotTags.length > 0 ? hotTags : groups.flatMap((group) => group.list || []);
  const selectedTagLabel = activeTagLabel || '全部分类';

  return (
    <MusicPage
      title='推荐歌单'
      subtitle={`歌单 · ${currentSourceLabel}`}
      actions={
        <MusicSwitch
          field='音源'
          value={activeSource}
          options={sourceOptions}
          onChange={(next) => {
            setActiveSource(next);
            updateQuery({ source: next, tagId: '', page: 1 });
          }}
        />
      }
    >
      <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
        {/* 两个选项：摊开比收进下拉少一次点击，也不用记"现在选的是哪个"。 */}
        <div className={MUSIC_SEG} role='group' aria-label='排序'>
          {sortOptions.map((item) => (
            <button
              key={item.id}
              type='button'
              aria-pressed={activeSortId === item.id}
              onClick={() => {
                setActiveSortId(item.id);
                updateQuery({ sortId: item.id, page: 1 });
              }}
              className={cn(
                MUSIC_SEG_ITEM,
                activeSortId === item.id ? MUSIC_SEG_ITEM_ACTIVE : MUSIC_SEG_ITEM_IDLE
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className='relative'>
          <button
            type='button'
            onClick={() => setShowTagMenu((open) => !open)}
            aria-haspopup='dialog'
            aria-expanded={showTagMenu}
            className={MUSIC_SWITCH}
          >
            <span className={MUSIC_SWITCH_KEY}>分类</span>
            <span className={MUSIC_SWITCH_VALUE}>
              {selectedTagLabel}
              <ChevronDown className={MUSIC_SWITCH_CARET} strokeWidth={2.5} />
            </span>
          </button>

          {showTagMenu ? (
            <>
              <button
                type='button'
                tabIndex={-1}
                aria-label='关闭分类'
                className='fixed inset-0 z-[55] cursor-default'
                onClick={() => setShowTagMenu(false)}
              />
              {/* 右侧贴齐触发器、向左展开；宽度上限留出 3rem 而不是 2rem——
                  100vw 在有没有竖向滚动条时会差十几 px，窄屏上正好会把面板顶出左边。 */}
              <div className='absolute right-0 top-[calc(100%+6px)] z-[60] max-h-[min(70vh,520px)] w-[min(760px,calc(100vw-3rem))] overflow-auto rounded-[4px] border border-music-edge bg-music-paper p-4 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)] dark:border-music-night-edge dark:bg-music-night-card'>
                {tagId ? (
                  <button
                    type='button'
                    onClick={() => selectTag('')}
                    className={cn(MUSIC_TAG, MUSIC_TAG_IDLE, 'mb-4')}
                  >
                    清除分类
                  </button>
                ) : null}

                {loadingTags ? (
                  <p className={cn(MUSIC_LABEL, 'py-6 text-center')}>正在取分类…</p>
                ) : flatTags.length === 0 ? (
                  <p className={cn(MUSIC_MUTED, 'py-6 text-center font-music-body text-[calc(12*var(--music-px))]')}>
                    当前音源无法获取此分类
                  </p>
                ) : (
                  <>
                    {hotTags.length > 0 ? (
                      <div className={MUSIC_TAG_GROUP}>
                        <span className={MUSIC_TAG_GROUP_LABEL}>热门分类</span>
                        <div className={MUSIC_TAG_WRAP}>
                          {hotTags.map((tag) => (
                            <button
                              key={tag.id}
                              type='button'
                              onClick={() => selectTag(tag.name)}
                              className={cn(
                                MUSIC_TAG,
                                tagId === tag.name ? MUSIC_TAG_ACTIVE : MUSIC_TAG_IDLE
                              )}
                            >
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {groups.map((group) => (
                      <div key={group.name} className={MUSIC_TAG_GROUP}>
                        <span className={MUSIC_TAG_GROUP_LABEL}>{group.name}</span>
                        <div className={MUSIC_TAG_WRAP}>
                          {group.list.map((tag) => (
                            <button
                              key={tag.id}
                              type='button'
                              onClick={() => selectTag(tag.name)}
                              className={cn(
                                MUSIC_TAG,
                                tagId === tag.name ? MUSIC_TAG_ACTIVE : MUSIC_TAG_IDLE
                              )}
                            >
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {loadingList ? (
        <MusicCardGridSkeleton count={10} />
      ) : songLists.length > 0 ? (
        <div className={MUSIC_COVER_GRID}>
          {songLists.map((item) => (
            <CoverCard
              key={item.id}
              name={item.name}
              cover={item.pic}
              sub={item.author || '未知作者'}
              meta={item.total ? `${item.total} 首` : ''}
              onOpen={() => openDetail(item)}
            />
          ))}
        </div>
      ) : (
        <MusicEmpty
          icon={Disc3}
          title={tagId ? '这个分类下没有歌单' : '当前音源无法获取此歌单'}
          hint={tagId ? '换个分类，或点上面的分类再选一次。' : '换一个音源试试。'}
          action={
            tagId ? (
              <button
                type='button'
                onClick={() => selectTag('')}
                className={MUSIC_GHOST_BUTTON}
              >
                清除分类
              </button>
            ) : null
          }
        />
      )}

      {total > 0 ? (
        <div className={MUSIC_PAGER}>
          <button
            type='button'
            disabled={page <= 1}
            onClick={() => updateQuery({ page: page - 1 })}
            className={MUSIC_GHOST_BUTTON}
          >
            上一页
          </button>
          <span className={MUSIC_PAGER_TEXT}>第 {page} 页</span>
          <button
            type='button'
            disabled={songLists.length === 0}
            onClick={() => updateQuery({ page: page + 1 })}
            className={MUSIC_GHOST_BUTTON}
          >
            下一页
          </button>
        </div>
      ) : null}
    </MusicPage>
  );
}
