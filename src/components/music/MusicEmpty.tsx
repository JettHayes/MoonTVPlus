import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';

import {
  MUSIC_COVER_GRID,
  MUSIC_EMPTY,
  MUSIC_EMPTY_HINT,
  MUSIC_EMPTY_TITLE,
  MUSIC_SKELETON,
  MUSIC_SLEEVE_GRID,
} from './tokens';

/** 空态。标题说发生了什么，副标题说接下来能做什么——不要只写"暂无数据"。 */
export default function MusicEmpty({
  title,
  hint,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  hint?: string;
  /** 图标走 lucide 那一族，别自己写手搓的组件签名——lucide 的 strokeWidth 收 string | number。 */
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(MUSIC_EMPTY, className)}>
      {Icon ? (
        <Icon
          className='mb-1 h-8 w-8 text-music-muted/70 dark:text-music-night-muted/70'
          strokeWidth={1.3}
        />
      ) : null}
      <div className={MUSIC_EMPTY_TITLE}>{title}</div>
      {hint ? <div className={MUSIC_EMPTY_HINT}>{hint}</div> : null}
      {action ? <div className='mt-3'>{action}</div> : null}
    </div>
  );
}

/**
 * 加载骨架。形状照着唱片套来——方图 + 两行字，这样内容到位时不会跳。
 * 不用音乐加载动画（MusicLoadingIndicator）：那个是给"正在拉数据"的短等待用的，
 * 长列表用骨架更稳。
 *
 * 栅格直接用 MUSIC_COVER_GRID，别再抄一份：抄的那份漏过一档列数，加载完会跳一下。
 */
export function MusicCardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={MUSIC_COVER_GRID}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className='flex flex-col gap-2'>
          <div className={cn(MUSIC_SKELETON, 'aspect-square w-full')} />
          <div className={cn(MUSIC_SKELETON, 'h-3 w-3/4')} />
          <div className={cn(MUSIC_SKELETON, 'h-2.5 w-1/2')} />
        </div>
      ))}
    </div>
  );
}

/**
 * 榜单卡（唱片套）的骨架。套面里装着全部内容，卡片下面没有字，
 * 所以骨架就是一个个方图——用上面那份会多出两行，加载完往上一收。
 */
export function MusicSleeveGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className={MUSIC_SLEEVE_GRID}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={cn(MUSIC_SKELETON, 'aspect-square w-full')} />
      ))}
    </div>
  );
}

/** 歌曲行的骨架。 */
export function MusicRowListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className='flex flex-col gap-2 pt-3'>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className='flex items-center gap-3 px-2 py-2'>
          <div className={cn(MUSIC_SKELETON, 'h-8 w-[34px] shrink-0 rounded-full')} />
          <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
            <div className={cn(MUSIC_SKELETON, 'h-3 w-1/3')} />
            <div className={cn(MUSIC_SKELETON, 'h-2.5 w-1/5')} />
          </div>
        </div>
      ))}
    </div>
  );
}
