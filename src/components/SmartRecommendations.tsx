'use client';

import { useCallback,useEffect, useState } from 'react';

import { useEnableComments } from '@/hooks/useEnableComments';
import { useRecommendationDataSource } from '@/hooks/useRecommendationDataSource';

import ScrollableRow from '@/components/ScrollableRow';
import VideoCard from '@/components/VideoCard';

import {
  getRecommendationCache,
  recommendationCacheKeys,
  setRecommendationCache,
} from '@/lib/recommendations/cache';

interface Recommendation {
  doubanId?: string;
  tmdbId?: number;
  title: string;
  poster: string;
  rating: string;
  mediaType?: 'movie' | 'tv';
}

interface SmartRecommendationsProps {
  doubanId?: number;
  videoTitle: string;
}

export default function SmartRecommendations({
  doubanId,
  videoTitle,
}: SmartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const enableComments = useEnableComments();
  const recommendationDataSource = useRecommendationDataSource();

  // 是否允许在豆瓣数据为空/失败时回退到 TMDB（仅混合模式）
  const allowTmdbFallback = useCallback(() => {
    const dataSource = recommendationDataSource || 'Mixed';
    // 纯 TMDB / 纯豆瓣模式不回退；Mixed 及未知模式回退 TMDB
    return dataSource !== 'TMDB' && dataSource !== 'Douban';
  }, [recommendationDataSource]);

  // 决定使用哪个数据源
  const getDataSource = useCallback(() => {
    // 如果没有配置，默认使用混合模式
    const dataSource = recommendationDataSource || 'Mixed';

    switch (dataSource) {
      case 'TMDB':
        return 'tmdb';
      case 'Douban':
        // 豆瓣类型需要检查开关和豆瓣ID
        return enableComments && doubanId ? 'douban' : null;
      case 'Mixed':
        // 混合模式：优先豆瓣，无豆瓣ID或关闭评论开关时使用TMDB
        if (!enableComments || !doubanId) {
          return 'tmdb';
        }
        return 'douban';
      default:
        return doubanId && enableComments ? 'douban' : 'tmdb';
    }
  }, [recommendationDataSource, enableComments, doubanId]);

  const fetchTMDBRecommendations = useCallback(async () => {
    if (!videoTitle) return;

    try {
      console.log('正在获取TMDB推荐');
      setLoading(true);

      const mappingCacheKey = recommendationCacheKeys.tmdbTitleMapping(videoTitle);
      const cachedId = getRecommendationCache<string>(mappingCacheKey);

      if (cachedId) {
        console.log('使用缓存的TMDB ID映射');

        const recommendationsCacheKey = recommendationCacheKeys.tmdbRecommendations(cachedId);
        const recommendationsCache = getRecommendationCache<Recommendation[]>(recommendationsCacheKey);

        if (recommendationsCache && recommendationsCache.length > 0) {
          console.log('使用缓存的TMDB推荐数据');
          setRecommendations(recommendationsCache);
          setLoading(false);
          return;
        }
      }

      // 构建请求URL
      const url = cachedId
        ? `/api/tmdb-recommendations?cachedId=${encodeURIComponent(cachedId)}`
        : `/api/tmdb-recommendations?title=${encodeURIComponent(videoTitle)}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('获取TMDB推荐失败');
      }

      const result = await response.json();
      const recommendationsData = result.recommendations || [];

      // 仅在拿到数据时替换列表；空结果保留已有列表，避免"一闪隐藏"
      if (recommendationsData.length > 0) {
        setRecommendations(recommendationsData);

        // 保存title到tmdbId的映射到localStorage（1个月）
        if (result.tmdbId) {
          try {
            setRecommendationCache(mappingCacheKey, String(result.tmdbId));

            const recommendationsCacheKey = recommendationCacheKeys.tmdbRecommendations(result.tmdbId);
            setRecommendationCache(recommendationsCacheKey, recommendationsData);
          } catch (e) {
            console.error('保存缓存失败:', e);
          }
        }
      }
    } catch (err) {
      // 失败时保留已有列表，不整块卸载
      console.error('获取TMDB推荐失败:', err);
    } finally {
      setLoading(false);
    }
  }, [videoTitle]);

  const fetchDoubanRecommendations = useCallback(async () => {
    if (!doubanId) return;

    try {
      console.log('正在获取豆瓣推荐');
      setLoading(true);

      const cacheKey = recommendationCacheKeys.doubanRecommendations(doubanId);
      const cached = getRecommendationCache<Recommendation[]>(cacheKey);

      if (cached && cached.length > 0) {
        console.log('使用缓存的豆瓣推荐数据');
        setRecommendations(cached);
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/douban-recommendations?id=${doubanId}`);

      if (!response.ok) {
        throw new Error('获取豆瓣推荐失败');
      }

      const result = await response.json();
      const recommendationsData = result.recommendations || [];

      if (recommendationsData.length > 0) {
        setRecommendations(recommendationsData);
        setRecommendationCache(cacheKey, recommendationsData);
      } else if (allowTmdbFallback()) {
        // 豆瓣无推荐结果，混合模式下回退 TMDB
        console.log('豆瓣推荐为空，回退 TMDB');
        await fetchTMDBRecommendations();
      }
    } catch (err) {
      console.error('获取豆瓣推荐失败:', err);
      // 混合模式：豆瓣失败回退 TMDB；回退也失败时（内部已兜底）保留已有列表
      if (allowTmdbFallback()) {
        console.log('豆瓣推荐失败，回退 TMDB');
        await fetchTMDBRecommendations();
      }
    } finally {
      setLoading(false);
    }
  }, [doubanId, allowTmdbFallback, fetchTMDBRecommendations]);

  useEffect(() => {
    const dataSource = getDataSource();

    if (!dataSource) {
      // 不显示推荐
      setRecommendations([]);
      return;
    }

    if (dataSource === 'douban') {
      fetchDoubanRecommendations();
    } else if (dataSource === 'tmdb') {
      fetchTMDBRecommendations();
    }
  }, [getDataSource, fetchDoubanRecommendations, fetchTMDBRecommendations]);

  // 如果不应该显示推荐，返回null
  const dataSource = getDataSource();
  if (!dataSource) {
    return null;
  }

  // 仅在首次加载（尚无任何数据）时展示加载动画；
  // 刷新/回退时保留已有内容，避免"一闪隐藏"
  if (loading && recommendations.length === 0) {
    return (
      <div className='flex justify-center items-center py-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-500'></div>
      </div>
    );
  }

  // 没有任何推荐数据时不渲染
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className='mt-6 -mx-3 md:mx-0 md:px-4'>
      <div className='bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden'>
        {/* 标题 */}
        <div className='px-3 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
            <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
              <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'/>
            </svg>
            更多推荐
          </h3>
        </div>

        {/* 推荐内容 */}
        <div className='px-3 pt-3 md:px-6 md:pt-6'>
          <ScrollableRow scrollDistance={600} bottomPadding='pb-2'>
            {recommendations.map((rec, index) => (
              <div
                key={rec.doubanId || rec.tmdbId || index}
                className='min-w-[96px] w-24 sm:min-w-[140px] sm:w-[140px]'
              >
                <VideoCard
                  title={rec.title}
                  poster={rec.poster}
                  rate={rec.rating}
                  douban_id={rec.doubanId ? parseInt(rec.doubanId) : undefined}
                  tmdb_id={rec.tmdbId}
                  from={rec.doubanId ? 'douban' : 'tmdb'}
                />
              </div>
            ))}
          </ScrollableRow>
        </div>
      </div>
    </div>
  );
}
