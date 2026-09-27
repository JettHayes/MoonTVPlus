/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { validateKeywordExpr } from '@/lib/anime-keyword-expr';
import {
  testEpisodeFilter,
  validateEpisodeRegex,
} from '@/lib/anime-subscription';

export const runtime = 'nodejs';

/**
 * POST /api/admin/anime-subscription/test
 * 集数过滤测试：按表单参数实际搜索一次，返回关键词命中与集数提取结果
 */
export async function POST(req: NextRequest) {
  try {
    // 权限检查
    const authInfo = getAuthInfoFromCookie(req);
    if (!authInfo || (authInfo.role !== 'admin' && authInfo.role !== 'owner')) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const {
      title,
      filterText,
      excludeText,
      source,
      episodeRegex,
      lastEpisode,
    } = await req.json();

    const keyword = typeof title === 'string' ? title.trim() : '';
    if (!keyword) {
      return NextResponse.json({ error: '番剧名称不能为空' }, { status: 400 });
    }
    if (!filterText || typeof filterText !== 'string') {
      return NextResponse.json({ error: '过滤关键词不能为空' }, { status: 400 });
    }
    if (!['acgrip', 'mikan', 'dmhy', 'nyaa'].includes(source)) {
      return NextResponse.json({ error: '无效的搜索源' }, { status: 400 });
    }

    const filterCheck = validateKeywordExpr(String(filterText), 'and');
    if (!filterCheck.ok) {
      return NextResponse.json(
        { error: `过滤关键词表达式无效: ${filterCheck.error}` },
        { status: 400 }
      );
    }
    if (typeof excludeText === 'string' && excludeText.trim()) {
      const excludeCheck = validateKeywordExpr(excludeText, 'or');
      if (!excludeCheck.ok) {
        return NextResponse.json(
          { error: `排除关键词表达式无效: ${excludeCheck.error}` },
          { status: 400 }
        );
      }
    }
    if (typeof episodeRegex === 'string' && episodeRegex.trim()) {
      const regexCheck = validateEpisodeRegex(episodeRegex);
      if (!regexCheck.ok) {
        return NextResponse.json(
          { error: `集数正则无效: ${regexCheck.error}` },
          { status: 400 }
        );
      }
    }

    const result = await testEpisodeFilter({
      title: keyword,
      filterText: String(filterText).trim(),
      excludeText: typeof excludeText === 'string' ? excludeText.trim() : '',
      source,
      episodeRegex: typeof episodeRegex === 'string' ? episodeRegex.trim() : '',
      lastEpisode:
        typeof lastEpisode === 'number' && Number.isFinite(lastEpisode)
          ? Math.max(0, Math.floor(lastEpisode))
          : 0,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('追番订阅集数测试失败:', error);
    return NextResponse.json(
      { error: error.message || '测试失败' },
      { status: 500 }
    );
  }
}
