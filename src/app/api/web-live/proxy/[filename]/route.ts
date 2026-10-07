import { NextRequest, NextResponse } from 'next/server';

import { requireFeaturePermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const REFERERS = [
  'https://www.huya.com/',
  'https://live.bilibili.com/',
  'https://live.douyin.com/',
];

function getReferer(url: URL, requestedReferer: string | null): string {
  if (requestedReferer && REFERERS.includes(requestedReferer)) {
    return requestedReferer;
  }

  const hostname = url.hostname.toLowerCase();
  const matchesDomain = (domain: string) =>
    hostname === domain || hostname.endsWith(`.${domain}`);

  if (matchesDomain('bilivideo.com') || matchesDomain('bilibili.com')) {
    return REFERERS[1];
  }

  if (
    matchesDomain('douyin.com') ||
    matchesDomain('douyincdn.com') ||
    matchesDomain('livehwc4.com')
  ) {
    return REFERERS[2];
  }

  return REFERERS[0];
}

function getProxyUrl(uri: string, baseUrl: string, referer: string): string {
  const target = new URL(uri, baseUrl);

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return uri;
  }

  const filename = target.pathname.split('/').pop() || 'proxy';

  return (
    `/api/web-live/proxy/${encodeURIComponent(filename)}` +
    `?url=${encodeURIComponent(target.href)}` +
    `&referer=${encodeURIComponent(referer)}`
  );
}

function processM3u8Content(
  content: string,
  baseUrl: string,
  referer: string
): string {
  return content
    .split('\n')
    .map((line) => {
      const trimmedLine = line.trim();

      if (!trimmedLine) return line;

      if (trimmedLine.startsWith('#')) {
        // 同时代理加密密钥、初始化片段和其他带 URI 的 HLS 标签。
        return line.replace(
          /(\bURI\s*=\s*)"([^"]+)"/g,
          (_match, prefix: string, uri: string) =>
            `${prefix}"${getProxyUrl(uri, baseUrl, referer)}"`
        );
      }

      // 子清单和视频分片，无论是 HTTP、HTTPS 还是相对路径，都走本站代理。
      return getProxyUrl(trimmedLine, baseUrl, referer);
    })
    .join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireFeaturePermission(
      request,
      'web_live',
      '无权限访问网络直播'
    );
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: '缺少URL参数' }, { status: 400 });
    }

    let sourceUrl: URL;
    try {
      sourceUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: '直播地址格式无效' }, { status: 400 });
    }

    if (sourceUrl.protocol !== 'http:' && sourceUrl.protocol !== 'https:') {
      return NextResponse.json({ error: '不支持的直播地址协议' }, { status: 400 });
    }

    const referer = getReferer(sourceUrl, searchParams.get('referer'));
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: referer,
    };

    // 保留 HLS 初始化片段、字节范围分片等请求所需的 Range 信息。
    const range = request.headers.get('range');
    if (range) {
      headers.Range = range;
      const ifRange = request.headers.get('if-range');
      if (ifRange) headers['If-Range'] = ifRange;
    }

    const streamRes = await fetch(sourceUrl.href, {
      headers,
      cache: 'no-store',
    });

    if (!streamRes.ok) {
      return NextResponse.json(
        { error: '无法获取直播流', upstreamStatus: streamRes.status },
        { status: streamRes.status >= 400 ? streamRes.status : 502 }
      );
    }

    // 使用重定向后的地址解析相对路径；判断后缀时排除签名查询参数。
    const finalUrl = streamRes.url || sourceUrl.href;
    const contentType = streamRes.headers.get('Content-Type') || '';
    const isM3u8 =
      /\.m3u8$/i.test(sourceUrl.pathname) ||
      /\.m3u8$/i.test(new URL(finalUrl).pathname) ||
      /application\/(?:vnd\.apple\.mpegurl|x-mpegurl)/i.test(contentType);

    if (isM3u8) {
      const content = (await streamRes.text()).trimStart();
      if (!content.startsWith('#EXTM3U')) {
        return NextResponse.json(
          { error: '上游未返回有效的直播清单' },
          { status: 502 }
        );
      }

      return new NextResponse(
        processM3u8Content(content, finalUrl, referer),
        {
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const responseHeaders = new Headers({
      'Content-Type': contentType || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });

    for (const name of ['Content-Range', 'Accept-Ranges']) {
      const value = streamRes.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    // 虎牙 FLV、视频分片和密钥保持二进制流式转发。
    return new NextResponse(streamRes.body, {
      status: streamRes.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: '直播代理请求失败，请稍后重试' },
      { status: 502 }
    );
  }
}
