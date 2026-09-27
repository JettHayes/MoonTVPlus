/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { getTVEpisodeImages } from '@/lib/tmdb.search';

export const runtime = 'nodejs';

/**
 * GET /api/tmdb/episode-images?id=xxx&season=xxx&episode=xxx
 * 获取电视剧某一集的剧照
 */
export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const season = searchParams.get('season');
    const episode = searchParams.get('episode');

    if (!id || !season || !episode) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const config = await getConfig();
    const tmdbApiKey = config.SiteConfig.TMDBApiKey;
    const tmdbProxy = config.SiteConfig.TMDBProxy;
    const tmdbReverseProxy = config.SiteConfig.TMDBReverseProxy;

    if (!tmdbApiKey) {
      return NextResponse.json({ error: 'TMDB API Key 未配置' }, { status: 400 });
    }

    const response = await getTVEpisodeImages(
      tmdbApiKey,
      parseInt(id),
      parseInt(season),
      parseInt(episode),
      tmdbProxy,
      tmdbReverseProxy
    );

    if (response.code !== 200 || !response.stills) {
      return NextResponse.json(
        { error: '获取失败', code: response.code },
        { status: response.code }
      );
    }

    return NextResponse.json({
      total: response.stills.length,
      list: response.stills,
    });
  } catch (error) {
    console.error('获取集数剧照失败:', error);
    return NextResponse.json(
      { error: '获取失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
