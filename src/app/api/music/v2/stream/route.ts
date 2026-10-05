import { NextRequest, NextResponse } from 'next/server';

import { getLxPlaybackSongInfo, isMusicSource, lxPostJson, normalizeMusicQuality, normalizeSong } from '@/lib/music-v2';
import { badRequest } from '@/lib/music-v2-api';
import { LxStreamCandidate, MusicStreamFailure, openMusicStream } from '@/lib/music-v2-stream';

export const runtime = 'nodejs';

const STREAM_URL_CACHE_TTL_MS = 10 * 60 * 1000;
type StreamUrlCacheValue = LxStreamCandidate & { url: string; expiresAt: number };
const globalMusicStreamCache = globalThis as typeof globalThis & {
  __musicV2ValidatedStreamUrlCache?: Map<string, StreamUrlCacheValue>;
};
const streamUrlCache = globalMusicStreamCache.__musicV2ValidatedStreamUrlCache ??
  new Map<string, StreamUrlCacheValue>();
globalMusicStreamCache.__musicV2ValidatedStreamUrlCache = streamUrlCache;

export async function GET(request: NextRequest) {
  let cacheKey = '';
  let source = '';
  let songId = '';
  let quality = '';
  try {
    const { searchParams } = new URL(request.url);
    source = searchParams.get('source') || '';
    songId = searchParams.get('songId') || '';
    quality = normalizeMusicQuality(searchParams.get('quality') || '320k');

    if (!isMusicSource(source)) return badRequest('不支持的音源');
    if (!songId) return badRequest('缺少歌曲ID');

    const song = normalizeSong({
      songId,
      source,
      songmid: searchParams.get('songmid') || undefined,
      name: searchParams.get('name') || '',
      artist: searchParams.get('artist') || '',
      durationText: searchParams.get('durationText') || undefined,
      hash: searchParams.get('hash') || undefined,
      copyrightId: searchParams.get('copyrightId') || undefined,
      albumId: searchParams.get('albumId') || undefined,
      lrcUrl: searchParams.get('lrcUrl') || undefined,
      mrcUrl: searchParams.get('mrcUrl') || undefined,
      trcUrl: searchParams.get('trcUrl') || undefined,
    });

    cacheKey = song.source + ':' + song.songId + ':' + quality;
    const entry = streamUrlCache.get(cacheKey);
    const cached = entry && entry.expiresAt > Date.now() ? entry : null;
    if (!cached) streamUrlCache.delete(cacheKey);
    let songInfo: Awaited<ReturnType<typeof getLxPlaybackSongInfo>> | undefined;

    const result = await openMusicStream({
      cached,
      range: request.headers.get('range'),
      signal: request.signal,
      resolve: async (excluded, signal) => {
        songInfo = songInfo || await getLxPlaybackSongInfo(song);
        return lxPostJson<LxStreamCandidate>('/api/music/url', {
          songInfo,
          quality,
          enableAutoSwitchApiSource: true,
          excludeApiSources: excluded,
        }, 'auto', signal);
      },
    });

    if (result.response.status === 416) {
      const headers = new Headers({ 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' });
      const contentRange = result.response.headers.get('content-range');
      if (contentRange) headers.set('Content-Range', contentRange);
      return new NextResponse(null, { status: 416, headers });
    }

    // Cache only after the upstream has returned non-error audio bytes.
    if (streamUrlCache.size >= 256 && !streamUrlCache.has(cacheKey)) {
      const oldest = streamUrlCache.keys().next().value;
      if (oldest !== undefined) streamUrlCache.delete(oldest);
    }
    streamUrlCache.set(cacheKey, {
      ...result.candidate,
      url: String(result.candidate.url),
      expiresAt: Date.now() + STREAM_URL_CACHE_TTL_MS,
    });
    if (result.attempts.length) {
      console.warn('[music-v2/stream] recovered', {
        source, songId, quality, attempts: result.attempts,
      });
    }

    const upstream = result.response;
    const headers = new Headers({
      'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
      'Cache-Control': 'private, no-store',
      'Accept-Ranges': upstream.headers.get('accept-ranges') || 'bytes',
      'Access-Control-Allow-Origin': '*',
    });
    for (const name of ['content-length', 'content-range', 'etag', 'last-modified']) {
      // fetch may decompress the body, making the original length invalid.
      if (name === 'content-length' && upstream.headers.get('content-encoding')) continue;
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    if (cacheKey) streamUrlCache.delete(cacheKey);
    const attempts = error instanceof MusicStreamFailure ? error.attempts : [];
    console.warn('[music-v2/stream] failed', { source, songId, quality, attempts });
    return NextResponse.json({
      success: false,
      error: { code: 'STREAM_FAILED', message: '当前音源未返回可播放音频', attempts },
    }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
