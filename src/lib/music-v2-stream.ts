export interface LxStreamCandidate {
  url?: unknown;
  sourceId?: string;
  sourceName?: string;
  type?: string;
}

export interface MusicStreamAttempt {
  sourceName?: string;
  stage: 'resolve' | 'audio';
  reason: string;
  status?: number;
}

export class MusicStreamFailure extends Error {
  constructor(public attempts: MusicStreamAttempt[]) {
    super('已尝试的音源均未返回可播放音频');
    this.name = 'MusicStreamFailure';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const MAX_CANDIDATES = 6;
const TOTAL_TIMEOUT_MS = 40000;
const CANDIDATE_TIMEOUT_MS = 12000;

function isHost(host: string, domain: string) {
  return host === domain || host.endsWith('.' + domain);
}

export function buildMusicUpstreamHeaders(url: URL, range: string | null) {
  const headers = new Headers({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Referer: url.origin,
  });
  if (range) headers.set('Range', range);
  const host = url.hostname.toLowerCase();
  if (isHost(host, 'kuwo.cn')) {
    headers.set('Referer', 'http://www.kuwo.cn/');
    headers.set('Origin', 'http://www.kuwo.cn');
  } else if (isHost(host, 'qq.com')) {
    headers.set('Referer', 'https://y.qq.com/');
    headers.set('Origin', 'https://y.qq.com');
  } else if (isHost(host, 'music.163.com')) {
    headers.set('Referer', 'https://music.163.com/');
    headers.set('Origin', 'https://music.163.com');
  }
  return headers;
}

export function isNonAudioResponse(contentType: string, prefix: Uint8Array) {
  if (/(?:json|html|xml)/i.test(contentType)) return true;
  const text = new TextDecoder().decode(prefix.subarray(0, 64));
  return /^\s*(?:\uFEFF\s*)?(?:\{\s*"|\[\s*(?:\{|")|<!doctype\b|<html\b|<\?xml\b)/i.test(text);
}

export function hasAudioSignature(bytes: Uint8Array) {
  const matches = (offset: number, value: string) =>
    Array.from(value).every((char, index) => bytes[offset + index] === char.charCodeAt(0));
  return matches(0, 'ID3') || matches(0, 'fLaC') || matches(0, 'OggS') ||
    matches(4, 'ftyp') || (matches(0, 'RIFF') && matches(8, 'WAVE')) ||
    (bytes.length > 1 && bytes[0] === 255 && (bytes[1] & 224) === 224);
}

interface OpenMusicStreamOptions {
  resolve: (excluded: string[], signal: AbortSignal) => Promise<LxStreamCandidate>;
  cached?: LxStreamCandidate | null;
  range: string | null;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

export async function openMusicStream(options: OpenMusicStreamOptions) {
  const attempts: MusicStreamAttempt[] = [];
  const excluded: string[] = [];
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;
  const fetcher = options.fetcher || fetch;
  const canRetry = !options.range || /^bytes=0-/i.test(options.range);
  let cached = options.cached;

  for (let index = 0; index < MAX_CANDIDATES; index++) {
    if (options.signal?.aborted) throw new MusicStreamFailure(attempts);
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      attempts.push({ stage: 'resolve', reason: 'TIME_BUDGET_EXCEEDED' });
      break;
    }

    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, Math.min(remaining, CANDIDATE_TIMEOUT_MS));
    let candidate: LxStreamCandidate | undefined;
    let stage: MusicStreamAttempt['stage'] = 'resolve';
    let reason = 'LX_RESOLVE_FAILED';
    let status: number | undefined;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let upstream: Response | undefined;

    try {
      candidate = cached || await options.resolve([...excluded], controller.signal);
      cached = null;
      reason = 'EMPTY_URL';
      if (typeof candidate.url !== 'string' || !candidate.url.trim()) throw new Error(reason);
      reason = 'INVALID_URL';
      const url = new URL(candidate.url);
      if (!['http:', 'https:'].includes(url.protocol) ||
          (isHost(url.hostname, 'qq.com') && url.pathname === '/&redirect=1')) {
        throw new Error(reason);
      }

      stage = 'audio';
      reason = 'UPSTREAM_NETWORK_ERROR';
      upstream = await fetcher(url.href, {
        headers: buildMusicUpstreamHeaders(url, options.range),
        signal: controller.signal,
        cache: 'no-store',
      });
      status = upstream.status;
      reason = 'UPSTREAM_HTTP_ERROR';
      if (status === 416 && !canRetry) {
        await upstream.body?.cancel();
        return {
          response: new Response(null, { status, headers: upstream.headers }),
          candidate,
          attempts,
        };
      }
      if (status !== 200 && status !== 206) throw new Error(reason);
      reason = 'EMPTY_AUDIO';
      if (!upstream.body) throw new Error(reason);

      reader = upstream.body.getReader();
      const chunks: Uint8Array[] = [];
      const prefix = new Uint8Array(64);
      let prefixLength = 0;
      let done = false;
      while (prefixLength < 64) {
        const part = await reader.read();
        if (part.done) {
          done = true;
          break;
        }
        chunks.push(part.value);
        const count = Math.min(part.value.length, 64 - prefixLength);
        prefix.set(part.value.subarray(0, count), prefixLength);
        prefixLength += count;
      }
      if (!prefixLength) throw new Error(reason);
      reason = 'UPSTREAM_NOT_AUDIO';
      const contentType = upstream.headers.get('content-type') || '';
      if (isNonAudioResponse(contentType, prefix.subarray(0, prefixLength))) throw new Error(reason);
      // Accept generic binary MIME types, but never pass JSON/HTML as audio.
      if (contentType && !/^(?:audio\/|video\/mp4\b|(?:application|binary)\/(?:octet-stream|ogg|x-flac|mp4)\b)/i.test(contentType)) {
        throw new Error(reason);
      }

      const startsAtBeginning = !options.range || /^bytes=0-/i.test(options.range) ||
        upstream.status === 200;
      if (startsAtBeginning && !hasAudioSignature(prefix.subarray(0, prefixLength))) {
        throw new Error(reason);
      }

      const streamReader = reader;
      const body = new ReadableStream<Uint8Array>({
        async pull(streamController) {
          if (chunks.length) {
            streamController.enqueue(chunks.shift() as Uint8Array);
            return;
          }
          if (done) {
            streamController.close();
            return;
          }
          try {
            const part = await streamReader.read();
            if (part.done) {
              done = true;
              streamController.close();
            } else {
              streamController.enqueue(part.value);
            }
          } catch (error) {
            streamController.error(error);
          }
        },
        cancel() {
          return streamReader.cancel();
        },
      });
      const response = new Response(body, {
        status: upstream.status,
        headers: upstream.headers,
      });
      return { response, candidate, attempts };
    } catch {
      if (reader) await reader.cancel().catch(() => undefined);
      else if (upstream?.body) await upstream.body.cancel().catch(() => undefined);
      if (controller.signal.aborted) reason = 'TIMEOUT_OR_ABORT';
      attempts.push({ sourceName: candidate?.sourceName, stage, reason, status });

      let added = false;
      for (const identity of [candidate?.sourceId, candidate?.sourceName]) {
        if (identity && !excluded.includes(identity)) {
          excluded.push(identity);
          added = true;
        }
      }
      // Without an identity, retrying would select the same bad source forever.
      if (!added || !canRetry) break;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }
  }
  throw new MusicStreamFailure(attempts);
}
