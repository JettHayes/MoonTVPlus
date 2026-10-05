/** @jest-environment node */
/* eslint-env jest */
import { ReadableStream } from 'node:stream/web';
import { runInThisContext } from 'node:vm';

import { hasAudioSignature, isNonAudioResponse, MusicStreamFailure, openMusicStream } from './music-v2-stream';

// Jest 27 predates Node's fetch globals; use the actual Node implementations.
const { Response, Headers } = runInThisContext('({ Response, Headers })');
Object.assign(globalThis, { Response, Headers, ReadableStream });

const audio = () => new Response(
  new Uint8Array([73, 68, 51, ...Array(100).fill(1)]),
  { headers: { 'Content-Type': 'audio/mpeg' } }
);
const source = (name, url = 'https://cdn.example.com/' + name + '.mp3') => ({
  sourceName: name, sourceId: 'id-' + name, url,
});

it('excludes a source that returns HTTP 200 without a URL', async () => {
  const resolve = jest.fn()
    .mockResolvedValueOnce({ sourceName: 'empty', sourceId: 'empty-id' })
    .mockResolvedValueOnce(source('working'));
  const result = await openMusicStream({
    range: null, resolve, fetcher: jest.fn().mockResolvedValue(audio()),
  });
  expect(resolve.mock.calls[1][0]).toEqual(['empty-id', 'empty']);
  expect(result.attempts[0].reason).toBe('EMPTY_URL');
  await result.response.body.cancel();
});

it('rejects the observed malformed QQ link before fetching it', async () => {
  const resolve = jest.fn()
    .mockResolvedValueOnce(source('bad', 'https://wx.music.tc.qq.com/&redirect=1'))
    .mockResolvedValueOnce(source('working'));
  const fetcher = jest.fn().mockResolvedValue(audio());
  const result = await openMusicStream({ range: null, resolve, fetcher });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(result.attempts[0].reason).toBe('INVALID_URL');
  await result.response.body.cancel();
});

it.each([403, 404, 522])('retries after upstream HTTP %i', async status => {
  const resolve = jest.fn()
    .mockResolvedValueOnce(source('bad'))
    .mockResolvedValueOnce(source('working'));
  const fetcher = jest.fn()
    .mockResolvedValueOnce(new Response('upstream error', { status }))
    .mockResolvedValueOnce(audio());
  const result = await openMusicStream({ range: null, resolve, fetcher });
  expect(resolve.mock.calls[1][0]).toContain('id-bad');
  expect(result.attempts[0]).toMatchObject({ reason: 'UPSTREAM_HTTP_ERROR', status });
  await result.response.body.cancel();
});

it('rejects an error JSON disguised as application/octet-stream', async () => {
  const resolve = jest.fn()
    .mockResolvedValueOnce(source('json'))
    .mockResolvedValueOnce(source('working'));
  const fetcher = jest.fn()
    .mockResolvedValueOnce(new Response('{"code":401,"msg":"error, has not any level"}', {
      headers: { 'Content-Type': 'application/octet-stream' },
    }))
    .mockResolvedValueOnce(audio());
  const result = await openMusicStream({ range: null, resolve, fetcher });
  expect(result.attempts[0].reason).toBe('UPSTREAM_NOT_AUDIO');
  await result.response.body.cancel();
});

it('rejects an HTML page with HTTP 200', async () => {
  const resolve = jest.fn()
    .mockResolvedValueOnce(source('html'))
    .mockResolvedValueOnce(source('working'));
  const fetcher = jest.fn()
    .mockResolvedValueOnce(new Response('<html>error</html>', {
      headers: { 'Content-Type': 'text/html' },
    }))
    .mockResolvedValueOnce(audio());
  const result = await openMusicStream({ range: null, resolve, fetcher });
  expect(result.attempts[0].reason).toBe('UPSTREAM_NOT_AUDIO');
  await result.response.body.cancel();
});

it('retries network failures without exposing the URL or exception text', async () => {
  const resolve = jest.fn()
    .mockResolvedValueOnce(source('dns', 'https://private.example.com/?secret=hidden'))
    .mockResolvedValueOnce(source('working'));
  const fetcher = jest.fn()
    .mockRejectedValueOnce(new Error('ENOTFOUND https://private.example.com/?secret=hidden'))
    .mockResolvedValueOnce(audio());
  const result = await openMusicStream({ range: null, resolve, fetcher });
  expect(result.attempts[0].reason).toBe('UPSTREAM_NETWORK_ERROR');
  expect(JSON.stringify(result.attempts)).not.toContain('secret');
  await result.response.body.cancel();
});

it('preserves all original bytes even when the first chunks are fragmented', async () => {
  const data = new Uint8Array([73, 68, 51, ...Array.from({ length: 200 }, (_, i) => i)]);
  const body = new ReadableStream({
    start(controller) {
      for (let offset = 0; offset < data.length; offset += 13)
        controller.enqueue(data.slice(offset, offset + 13));
      controller.close();
    },
  });
  const result = await openMusicStream({
    range: null,
    resolve: jest.fn().mockResolvedValue(source('working')),
    fetcher: jest.fn().mockResolvedValue(new Response(body, {
      headers: { 'Content-Type': 'audio/mpeg' },
    })),
  });
  expect(new Uint8Array(await result.response.arrayBuffer())).toEqual(data);
});

it('forwards Range and preserves a successful 206 response', async () => {
  const fetcher = jest.fn().mockResolvedValue(new Response(new Uint8Array(100).fill(128), {
    status: 206,
    headers: { 'Content-Type': 'audio/mpeg', 'Content-Range': 'bytes 100-199/1000' },
  }));
  const result = await openMusicStream({
    range: 'bytes=100-199',
    resolve: jest.fn().mockResolvedValue(source('working')),
    fetcher,
  });
  expect(fetcher.mock.calls[0][1].headers.get('Range')).toBe('bytes=100-199');
  expect(result.response.status).toBe(206);
  expect(result.response.headers.get('Content-Range')).toBe('bytes 100-199/1000');
  expect((await result.response.arrayBuffer()).byteLength).toBe(100);
});

it('does not mix another source into an already-started byte-range stream', async () => {
  const resolve = jest.fn().mockResolvedValue(source('bad'));
  await expect(openMusicStream({
    range: 'bytes=100-199', resolve,
    fetcher: jest.fn().mockResolvedValue(new Response('denied', { status: 403 })),
  })).rejects.toBeInstanceOf(MusicStreamFailure);
  expect(resolve).toHaveBeenCalledTimes(1);
});

it('preserves HTTP 416 for an out-of-bounds seek', async () => {
  const result = await openMusicStream({
    range: 'bytes=1000-',
    resolve: jest.fn().mockResolvedValue(source('working')),
    fetcher: jest.fn().mockResolvedValue(new Response(null, {
      status: 416, headers: { 'Content-Range': 'bytes */1000' },
    })),
  });
  expect(result.response.status).toBe(416);
  expect(result.response.headers.get('Content-Range')).toBe('bytes */1000');
});

it('stops after six candidates and never includes signed URLs in errors', async () => {
  let index = 0;
  const resolve = jest.fn(async () => source('bad-' + index++));
  await expect(openMusicStream({
    range: null, resolve,
    fetcher: jest.fn(async () => new Response('denied', { status: 403 })),
  })).rejects.toMatchObject({ attempts: expect.any(Array) });
  expect(resolve).toHaveBeenCalledTimes(6);
});

it('stops safely if LX fails without identifying a source', async () => {
  const resolve = jest.fn().mockRejectedValue(new Error('HTTP 401: private details'));
  try {
    await openMusicStream({ range: null, resolve, fetcher: jest.fn() });
    throw new Error('Expected failure');
  } catch (error) {
    expect(error).toBeInstanceOf(MusicStreamFailure);
    expect(error.attempts).toEqual([{ stage: 'resolve', reason: 'LX_RESOLVE_FAILED' }]);
  }
  expect(resolve).toHaveBeenCalledTimes(1);
});

it('recognizes JSON and HTML without rejecting a normal FLAC header', () => {
  const bytes = text => new TextEncoder().encode(text);
  expect(isNonAudioResponse('', bytes('{"code":401}'))).toBe(true);
  expect(isNonAudioResponse('application/octet-stream', bytes('<html>error'))).toBe(true);
  expect(isNonAudioResponse('audio/flac', bytes('fLaC123456'))).toBe(false);
});

it('rejects non-audio binary data with an octet-stream MIME type', async () => {
  const resolve = jest.fn().mockResolvedValue(source('pdf'));
  await expect(openMusicStream({
    range: null, resolve,
    fetcher: jest.fn().mockResolvedValue(new Response('%PDF-1.7 not music', {
      headers: { 'Content-Type': 'application/octet-stream' },
    })),
  })).rejects.toMatchObject({
    attempts: expect.arrayContaining([expect.objectContaining({ reason: 'UPSTREAM_NOT_AUDIO' })]),
  });
});

it('recognizes the common audio file signatures', () => {
  const bytes = text => new TextEncoder().encode(text);
  for (const header of ['ID3', 'fLaC', 'OggS', '0000ftyp', 'RIFF0000WAVE'])
    expect(hasAudioSignature(bytes(header))).toBe(true);
  expect(hasAudioSignature(new Uint8Array([255, 251]))).toBe(true);
  expect(hasAudioSignature(bytes('%PDF-1.7'))).toBe(false);
});
