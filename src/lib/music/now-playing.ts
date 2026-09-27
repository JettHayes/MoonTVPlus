'use client';

import { useEffect, useState } from 'react';

import { normalizeSource } from '@/lib/music/shared';

/**
 * 「正在播放」这件事，页面只能靠猜。
 *
 * 播放器（MusicClient）只收事件、从不往回广播状态：音乐模块的事件总线是单向的。
 * 所以这里用两条能拿到的线索凑一个够用的答案——
 *   1. 播放器每次换歌都会把整份状态写进 localStorage.musicPlayState，挂载时读它；
 *   2. 本页点歌时会派发 music:play-song / music:play-all，同一路由内立刻跟上。
 * 跨标签页、或者播放器自己自动切到下一首时，这里的答案会过期——所以界面上
 * 只把它当"高亮当前这条"，不拿它做任何判断。
 */

/** 一首歌的身份。不同接口回来的同一首歌，归一化后 key 是同一个。 */
export function songKey(
  song: { platform?: string; id?: string | number } | null | undefined
): string | null {
  if (!song || song.id === undefined || song.id === null || song.id === '') {
    return null;
  }
  return `${normalizeSource(song.platform)}:${String(song.id)}`;
}

function readPersistedKey(): string | null {
  try {
    const raw = localStorage.getItem('musicPlayState');
    if (!raw) return null;
    return songKey(JSON.parse(raw)?.currentSong);
  } catch {
    // 隐私模式 / 存储被清掉 / JSON 坏了，都当作"没有正在播放"
    return null;
  }
}

export function useNowPlaying(): string | null {
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    setKey(readPersistedKey());

    const onPlaySong = (event: Event) => {
      const next = songKey((event as CustomEvent)?.detail?.song);
      if (next) setKey(next);
    };
    const onPlayAll = (event: Event) => {
      const songs = (event as CustomEvent)?.detail?.songs;
      const next = Array.isArray(songs) ? songKey(songs[0]) : null;
      if (next) setKey(next);
    };

    window.addEventListener('music:play-song', onPlaySong);
    window.addEventListener('music:play-all', onPlayAll);
    return () => {
      window.removeEventListener('music:play-song', onPlaySong);
      window.removeEventListener('music:play-all', onPlayAll);
    };
  }, []);

  return key;
}
