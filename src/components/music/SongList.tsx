'use client';

import { Clock3, Heart, ImageOff } from 'lucide-react';
import { useState } from 'react';

import { addMusicSongToPlaylist, playMusicLater, playMusicSong } from '@/lib/music/actions';
import { cn } from '@/lib/cn';
import { songKey, useNowPlaying } from '@/lib/music/now-playing';
import { musicSources } from '@/lib/music/shared';
import type { Song } from '@/lib/music/types';

import {
  MUSIC_ART_BROKEN,
  MUSIC_ICON_BUTTON,
  MUSIC_LIST,
  MUSIC_ROW,
  MUSIC_ROW_ACTIONS,
  MUSIC_ROW_ART,
  MUSIC_ROW_ARTIST,
  MUSIC_ROW_DURATION,
  MUSIC_ROW_INDEX,
  MUSIC_ROW_NAME,
  MUSIC_ROW_NAME_THEME,
  MUSIC_ROW_PLAYING,
  MUSIC_ROW_SOURCE,
  MUSIC_ROW_TEXT,
} from './tokens';

/** 时长：接口给的格式不统一（有的 "04:29"、有的就是秒数），能认的都认。 */
function formatDuration(song: Song): string {
  const text = song.durationText ? String(song.durationText) : '';
  if (/^\d+:\d{2}$/.test(text)) return text;

  const seconds = Number(song.duration) || Number(text) || 0;
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function sourceLabel(platform?: string): string {
  return musicSources.find((item) => item.key === platform)?.label || '';
}

/**
 * 歌曲行。封面是一张圆盘——外壳是盘，中间的封面是标签，盘上一道会转的高光；
 * 正在播放那一条盘转起来、左缘起一道主题色、歌名转主题色。
 *
 * 正在播放的判断是"够用"而不是"准确"的，见 src/lib/music/now-playing.ts。
 */
function SongRow({
  song,
  index,
  nowPlaying,
  extraActions,
}: {
  song: Song;
  index: number;
  /** 当前播放曲目的 key，由 SongList 统一读一次，别每行各订一份。 */
  nowPlaying: string | null;
  /** 行尾追加的动作（"我的歌单"里的移除）。渲染在同一格里，不改列数。 */
  extraActions?: React.ReactNode;
}) {
  const [coverFailed, setCoverFailed] = useState(false);

  const playing = nowPlaying !== null && nowPlaying === songKey(song);
  const cover = song.pic && !coverFailed ? song.pic : '';
  const duration = formatDuration(song);
  const label = sourceLabel(song.platform);

  return (
    <div
      role='button'
      tabIndex={0}
      aria-current={playing ? 'true' : undefined}
      onClick={() => playMusicSong(song, index)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          playMusicSong(song, index);
        }
      }}
      className={cn(MUSIC_ROW, playing && MUSIC_ROW_PLAYING)}
    >
      <span className={MUSIC_ROW_INDEX}>{String(index + 1).padStart(2, '0')}</span>

      <span className={MUSIC_ROW_ART}>
        {cover ? (
          <img
            src={cover}
            alt=''
            loading='lazy'
            referrerPolicy='no-referrer'
            onError={() => setCoverFailed(true)}
            className='h-full w-full object-cover'
          />
        ) : (
          // 歌曲的封面和歌单一样是实打实给的，走到这儿只有一个原因：图挂了。
          // 所以是一个破图记号，不是"这个位置该有张图"的留白（那是热榜套面的事）。
          <span className={MUSIC_ART_BROKEN}>
            <ImageOff className='h-3.5 w-3.5' strokeWidth={1.6} />
          </span>
        )}
      </span>

      <span className={MUSIC_ROW_TEXT}>
        <span className={cn(MUSIC_ROW_NAME, playing && MUSIC_ROW_NAME_THEME)}>
          {song.name}
        </span>
        <span className={MUSIC_ROW_ARTIST}>{song.artist}</span>
      </span>

      <span className={MUSIC_ROW_DURATION}>{duration}</span>
      <span className={MUSIC_ROW_SOURCE}>{label}</span>

      <span className={MUSIC_ROW_ACTIONS}>
        <button
          type='button'
          title='添加到歌单'
          aria-label='添加到歌单'
          onClick={(event) => {
            event.stopPropagation();
            addMusicSongToPlaylist(song);
          }}
          className={MUSIC_ICON_BUTTON}
        >
          <Heart className='h-3.5 w-3.5' strokeWidth={1.9} />
        </button>
        <button
          type='button'
          title='稍后播放'
          aria-label='稍后播放'
          onClick={(event) => {
            event.stopPropagation();
            playMusicLater(song);
          }}
          className={MUSIC_ICON_BUTTON}
        >
          <Clock3 className='h-3.5 w-3.5' strokeWidth={1.9} />
        </button>
        {extraActions}
      </span>
    </div>
  );
}

export default function SongList({
  songs,
  extraActions,
}: {
  songs: Song[];
  /** 每行都要追加的一个动作，见 SongRow。 */
  extraActions?: (song: Song, index: number) => React.ReactNode;
}) {
  // 整张列表只订一次"正在播放"，不要每行各订一份。
  const nowPlaying = useNowPlaying();

  if (songs.length === 0) return null;

  return (
    <div className={MUSIC_LIST}>
      {songs.map((song, index) => (
        <SongRow
          key={`${song.platform}-${song.id}-${index}`}
          song={song}
          index={index}
          nowPlaying={nowPlaying}
          extraActions={extraActions?.(song, index)}
        />
      ))}
    </div>
  );
}
