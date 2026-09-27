/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

'use client';

import { Search, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  EpisodeTitleCorrection,
  getEpisodeTitleCorrection,
  setEpisodeTitleCorrection,
} from '@/lib/episode-title-correction';
import { getTMDBImageUrl } from '@/lib/tmdb.search';
import { processImageUrl } from '@/lib/utils';

interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  vote_average: number;
  media_type: 'movie' | 'tv';
}

interface TMDBSeason {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  overview: string;
}

interface EpisodeTitleCorrectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  videoTitle: string;
  totalEpisodes: number;
}

export default function EpisodeTitleCorrectDialog({
  isOpen,
  onClose,
  videoTitle,
  totalEpisodes,
}: EpisodeTitleCorrectDialogProps) {
  const [correction, setCorrection] = useState<EpisodeTitleCorrection>({});

  // TMDB 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState<TMDBResult | null>(null);
  const [seasons, setSeasons] = useState<TMDBSeason[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [showSeasonSelection, setShowSeasonSelection] = useState(false);

  // 打开时载入当前标题的矫正配置并重置搜索状态
  useEffect(() => {
    if (!isOpen) return;
    setCorrection(getEpisodeTitleCorrection(videoTitle));
    setSearchQuery(videoTitle || '');
    setResults([]);
    setError('');
    setSelectedResult(null);
    setSeasons([]);
    setShowSeasonSelection(false);
  }, [isOpen, videoTitle]);

  // 合并写入并刷新本地状态
  const update = (patch: Partial<EpisodeTitleCorrection>) => {
    setEpisodeTitleCorrection(videoTitle, patch);
    setCorrection(getEpisodeTitleCorrection(videoTitle));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('请输入搜索关键词');
      return;
    }
    setSearching(true);
    setError('');
    setResults([]);
    setShowSeasonSelection(false);
    setSelectedResult(null);
    try {
      const resp = await fetch(
        `/api/tmdb/search?query=${encodeURIComponent(searchQuery)}`
      );
      if (!resp.ok) throw new Error('搜索失败');
      const data = await resp.json();
      if (data.success && data.results) {
        // 分集名矫正只针对电视剧
        const tvOnly = (data.results as TMDBResult[]).filter(
          (r) => r.media_type === 'tv'
        );
        setResults(tvOnly);
        if (tvOnly.length === 0) setError('未找到匹配的电视剧');
      } else {
        setError('搜索失败');
      }
    } catch (err) {
      console.error('TMDB 搜索失败:', err);
      setError('搜索失败，请重试');
    } finally {
      setSearching(false);
    }
  };

  const fetchSeasons = async (tvId: number): Promise<TMDBSeason[]> => {
    setLoadingSeasons(true);
    setError('');
    try {
      const resp = await fetch(`/api/tmdb/seasons?tvId=${tvId}`);
      if (!resp.ok) throw new Error('获取季度列表失败');
      const data = await resp.json();
      if (data.success && data.seasons) return data.seasons as TMDBSeason[];
      setError('获取季度列表失败');
      return [];
    } catch (err) {
      console.error('获取季度列表失败:', err);
      setError('获取季度列表失败，请重试');
      return [];
    } finally {
      setLoadingSeasons(false);
    }
  };

  // 选中搜索结果：拉季度列表，单季直接应用，多季进入季度选择
  const handleSelectResult = async (result: TMDBResult) => {
    setSelectedResult(result);
    const list = await fetchSeasons(result.id);
    // 过滤掉「特别篇 season 0」等非正片季
    const normal = list.filter((s) => s.season_number >= 1);
    if (normal.length <= 1) {
      applyTmdb(result.id, normal[0]?.season_number ?? 1);
    } else {
      setSeasons(normal);
      setShowSeasonSelection(true);
    }
  };

  // 写入选定的 TMDB 剧集与季，并切回主界面
  const applyTmdb = (tmdbId: number, season: number) => {
    update({ tmdbId, season, preferDanmaku: undefined });
    setShowSeasonSelection(false);
    setResults([]);
    setSelectedResult(null);
  };

  const clearTmdb = () => update({ tmdbId: undefined, season: undefined });

  if (!isOpen) return null;

  const disabled = !!correction.disabled;
  const preferDanmaku = !!correction.preferDanmaku;
  const hasTmdb = typeof correction.tmdbId === 'number';

  return createPortal(
    <div
      className='fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4'
      onClick={onClose}
    >
      <div
        className='w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col rounded-2xl bg-white dark:bg-gray-800 shadow-xl'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
      >
        {/* 头部 */}
        <div className='flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700'>
          <span className='text-base font-semibold text-gray-900 dark:text-gray-100'>
            手动矫正标题
          </span>
          <button
            className='p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
            onClick={onClose}
            aria-label='关闭'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto px-5 py-4 space-y-5'>
          {/* 禁用本剧集 */}
          <label className='flex items-start justify-between gap-3 cursor-pointer'>
            <div className='min-w-0'>
              <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                禁用本剧集
              </div>
              <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                仅对本剧生效：不获取分集名，保持数字网格。
              </p>
            </div>
            <SwitchButton
              checked={disabled}
              disabled={!videoTitle}
              onClick={() => update({ disabled: !disabled })}
            />
          </label>

          {!disabled && (
            <>
              {/* 弹幕优先（不用搜 TMDB） */}
              <label className='flex items-start justify-between gap-3 cursor-pointer'>
                <div className='min-w-0'>
                  <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                    弹幕优先
                  </div>
                  <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                    直接用弹幕分集名，不搜索、不使用 TMDB。
                  </p>
                </div>
                <SwitchButton
                  checked={preferDanmaku}
                  disabled={!videoTitle}
                  onClick={() =>
                    update({
                      preferDanmaku: !preferDanmaku,
                      // 打开弹幕优先时清掉手动 TMDB 选择
                      tmdbId: !preferDanmaku ? undefined : correction.tmdbId,
                      season: !preferDanmaku ? undefined : correction.season,
                    })
                  }
                />
              </label>

              {/* 指定 TMDB */}
              {!preferDanmaku && (
                <div className='space-y-2'>
                  <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                    指定 TMDB 剧集
                  </div>
                  {hasTmdb ? (
                    <div className='flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2'>
                      <span className='text-sm text-gray-700 dark:text-gray-200'>
                        已指定：TMDB #{correction.tmdbId} · 第 {correction.season} 季
                      </span>
                      <button
                        className='text-xs text-red-500 hover:text-red-600'
                        onClick={clearTmdb}
                      >
                        清除
                      </button>
                    </div>
                  ) : (
                    <TmdbSearchArea
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      searching={searching}
                      error={error}
                      results={results}
                      seasons={seasons}
                      loadingSeasons={loadingSeasons}
                      showSeasonSelection={showSeasonSelection}
                      selectedResult={selectedResult}
                      onSearch={handleSearch}
                      onSelectResult={handleSelectResult}
                      onSelectSeason={(s) =>
                        selectedResult && applyTmdb(selectedResult.id, s.season_number)
                      }
                      onBack={() => setShowSeasonSelection(false)}
                    />
                  )}
                </div>
              )}

              {/* 起始集数 */}
              <div className='space-y-1'>
                <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                  起始集数
                </div>
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  视频第 1 集对应 TMDB 的第几集。TMDB 把多季合在一季连续编号（本剧其实是第 2/3 季）时，用它对齐，例如填 13。
                </p>
                <input
                  type='number'
                  min={1}
                  value={correction.startEpisode ?? ''}
                  placeholder='1'
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    update({
                      startEpisode:
                        Number.isFinite(v) && v > 1 ? v : undefined,
                    });
                  }}
                  className='w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
                {totalEpisodes > 0 && (
                  <p className='text-xs text-gray-400 dark:text-gray-500'>
                    本视频共 {totalEpisodes} 集
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// 开关按钮
function SwitchButton({
  checked,
  disabled,
  onClick,
}: {
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// TMDB 搜索 + 季度选择
function TmdbSearchArea({
  searchQuery,
  setSearchQuery,
  searching,
  error,
  results,
  seasons,
  loadingSeasons,
  showSeasonSelection,
  selectedResult,
  onSearch,
  onSelectResult,
  onSelectSeason,
  onBack,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searching: boolean;
  error: string;
  results: TMDBResult[];
  seasons: TMDBSeason[];
  loadingSeasons: boolean;
  showSeasonSelection: boolean;
  selectedResult: TMDBResult | null;
  onSearch: () => void;
  onSelectResult: (r: TMDBResult) => void;
  onSelectSeason: (s: TMDBSeason) => void;
  onBack: () => void;
}) {
  if (showSeasonSelection) {
    return (
      <div>
        <button
          onClick={onBack}
          className='mb-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400'
        >
          ← 返回搜索结果
        </button>
        {selectedResult && (
          <div className='mb-2 text-sm text-gray-600 dark:text-gray-400'>
            {selectedResult.title || selectedResult.name} · 请选择季度
          </div>
        )}
        {loadingSeasons ? (
          <div className='py-6 text-center text-sm text-gray-500'>
            加载季度中...
          </div>
        ) : (
          <div className='space-y-2 max-h-64 overflow-y-auto'>
            {seasons.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSeason(s)}
                className='w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left'
              >
                <span className='text-sm text-gray-900 dark:text-gray-100'>
                  {s.name}
                </span>
                <span className='text-xs text-gray-500'>{s.episode_count} 集</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className='flex gap-2'>
        <input
          type='text'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder='搜索剧名'
          className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        />
        <button
          onClick={onSearch}
          disabled={searching}
          className='px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 flex items-center'
        >
          <Search className='w-4 h-4' />
        </button>
      </div>
      {error && (
        <p className='mt-2 text-sm text-red-600 dark:text-red-400'>{error}</p>
      )}
      {results.length > 0 && (
        <div className='mt-2 space-y-2 max-h-64 overflow-y-auto'>
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelectResult(r)}
              disabled={loadingSeasons}
              className='w-full flex gap-3 p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left disabled:opacity-50'
            >
              <div className='flex-shrink-0 w-10 h-14 relative rounded overflow-hidden bg-gray-200 dark:bg-gray-700'>
                {r.poster_path && (
                  <Image
                    src={processImageUrl(getTMDBImageUrl(r.poster_path))}
                    alt={r.title || r.name || ''}
                    fill
                    className='object-cover'
                    referrerPolicy='no-referrer'
                  />
                )}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                  {r.title || r.name}
                </div>
                <div className='text-xs text-gray-500 mt-0.5'>
                  {r.first_air_date?.split('-')[0] || '未知'} · 评分{' '}
                  {r.vote_average.toFixed(1)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


