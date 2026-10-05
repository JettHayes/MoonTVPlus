/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { requireFeaturePermission } from '@/lib/permissions';
import { getConfig } from '@/lib/config';
import { PansouLink, searchPansou } from '@/lib/pansou.client';

export const runtime = 'nodejs';

// NetDiskConfig 平台键 -> pansou 网盘类型键
const NETDISK_CONFIG_TO_CLOUD_TYPE: Record<string, string> = {
  Quark: 'quark',
  Mobile: 'mobile',
  Baidu: 'baidu',
  Tianyi: 'tianyi',
  Pan123: '123',
  UC: 'uc',
  Pan115: '115',
};

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireFeaturePermission(
      request,
      'netdisk_search',
      '无权限使用网盘搜索'
    );
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { keyword } = body;
    const cloudTypes = Array.isArray(body.cloud_types)
      ? body.cloud_types.filter(
          (item: unknown): item is string =>
            typeof item === 'string' && item.trim().length > 0
        )
      : undefined;

    if (!keyword) {
      return NextResponse.json({ error: '关键词不能为空' }, { status: 400 });
    }

    // 从系统配置中获取 Pansou 配置
    const config = await getConfig();
    const apiUrl = config.SiteConfig.PansouApiUrl;
    const username = config.SiteConfig.PansouUsername;
    const password = config.SiteConfig.PansouPassword;

    console.log('Pansou 搜索请求:', {
      keyword,
      apiUrl: apiUrl ? '已配置' : '未配置',
      hasAuth: !!(username && password),
      cloudTypes: cloudTypes?.length ? cloudTypes : 'all',
    });

    if (!apiUrl) {
      return NextResponse.json(
        { error: '未配置 Pansou API 地址，请在管理面板配置' },
        { status: 400 }
      );
    }

    // 调用 Pansou 搜索
    const results = await searchPansou(apiUrl, keyword, {
      username,
      password,
      cloudTypes,
    });

    const rawBlocklist = config.SiteConfig.PansouKeywordBlocklist || '';
    const normalizedBlocklist = rawBlocklist.replace(/，/g, ',');
    const blockedKeywords = normalizedBlocklist
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    let filteredResults = results;

    if (blockedKeywords.length > 0 && results.merged_by_type) {
      const mergedByType: Record<string, PansouLink[]> = {};
      let total = 0;

      const shouldBlock = (link: PansouLink) => {
        const content = `${link.note || ''} ${link.url || ''} ${
          link.source || ''
        }`.toLowerCase();
        return blockedKeywords.some((item) =>
          content.includes(item.toLowerCase())
        );
      };

      Object.entries(results.merged_by_type).forEach(([type, links]) => {
        const filteredLinks = links.filter((link) => !shouldBlock(link));
        if (filteredLinks.length > 0) {
          mergedByType[type] = filteredLinks;
          total += filteredLinks.length;
        }
      });

      filteredResults = {
        ...results,
        merged_by_type: mergedByType,
        total,
      };
    }

    // 已配置账号的网盘类型排在前面
    const netDiskConfig = (config.NetDiskConfig || {}) as Record<
      string,
      { Enabled?: boolean } | undefined
    >;
    const configuredCloudTypes = new Set<string>();
    Object.entries(NETDISK_CONFIG_TO_CLOUD_TYPE).forEach(
      ([configKey, cloudType]) => {
        if (netDiskConfig[configKey]?.Enabled) {
          configuredCloudTypes.add(cloudType);
        }
      }
    );

    if (configuredCloudTypes.size > 0 && filteredResults.merged_by_type) {
      const reordered: Record<string, PansouLink[]> = {};
      Object.entries(filteredResults.merged_by_type)
        .map(([type, links], index) => ({ type, links, index }))
        .sort((a, b) => {
          const aPriority = configuredCloudTypes.has(a.type) ? 0 : 1;
          const bPriority = configuredCloudTypes.has(b.type) ? 0 : 1;
          if (aPriority !== bPriority) return aPriority - bPriority;
          return a.index - b.index; // 同优先级保持原有顺序
        })
        .forEach(({ type, links }) => {
          reordered[type] = links;
        });

      filteredResults = {
        ...filteredResults,
        merged_by_type: reordered,
      };
    }

    console.log('Pansou 搜索结果:', {
      total: filteredResults.total,
      hasData: !!filteredResults.merged_by_type,
      types: filteredResults.merged_by_type
        ? Object.keys(filteredResults.merged_by_type)
        : [],
    });

    return NextResponse.json(filteredResults);
  } catch (error: any) {
    console.error('Pansou 搜索失败:', error);
    return NextResponse.json(
      { error: error.message || '搜索失败' },
      { status: 500 }
    );
  }
}
