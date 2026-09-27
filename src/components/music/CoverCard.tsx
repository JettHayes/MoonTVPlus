'use client';

import { ImageOff } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/cn';

import {
  MUSIC_ART_BROKEN,
  MUSIC_ART_BROKEN_LABEL,
  MUSIC_COVER,
  MUSIC_COVER_BODY,
  MUSIC_COVER_FRAME,
  MUSIC_COVER_META,
  MUSIC_COVER_NAME,
} from './tokens';

/**
 * 歌单 / 专辑卡：一张真封面 + 下面两行字。和热榜的唱片套是**两种卡**，
 * 因为这两种数据本来就不一样——歌单接口实打实给图，榜单接口一张都没有。
 *
 * 这里唯一的意外是**图挂了**（404、防盗链、上游图床抽了），落到一个破图记号上。
 * 它跟热榜卡面必须一眼分得开：热榜面是一张有版面的套子（大号编号 + 名字），
 * 这里是一块空卡纸加一个破图标记。别把两者的兜底合成一个"没有图"的样子。
 */
export default function CoverCard({
  name,
  cover,
  meta,
  sub,
  onOpen,
}: {
  name: string;
  cover?: string;
  /** 右下角的计数（"120 首"）。 */
  meta?: React.ReactNode;
  /** 左下角那行（作者）。 */
  sub?: React.ReactNode;
  onOpen: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const src = cover && !failed ? cover : '';

  return (
    <button type='button' onClick={onOpen} className={MUSIC_COVER}>
      <span className={MUSIC_COVER_FRAME}>
        {src ? (
          <img
            src={src}
            alt=''
            loading='lazy'
            referrerPolicy='no-referrer'
            onError={() => setFailed(true)}
            className='h-full w-full object-cover'
          />
        ) : (
          <span className={MUSIC_ART_BROKEN}>
            <ImageOff className='h-6 w-6' strokeWidth={1.4} />
            <span className={MUSIC_ART_BROKEN_LABEL}>图挂了</span>
          </span>
        )}
      </span>
      <span className={cn(MUSIC_COVER_BODY, 'block')}>
        <span className={cn(MUSIC_COVER_NAME, 'block')}>{name}</span>
        {sub || meta ? (
          <span className={MUSIC_COVER_META}>
            <span className='truncate'>{sub}</span>
            <span className='shrink-0'>{meta}</span>
          </span>
        ) : null}
      </span>
    </button>
  );
}
