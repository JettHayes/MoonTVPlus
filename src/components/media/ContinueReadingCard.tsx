import Link from 'next/link';

import { cn } from '@/lib/cn';

import ProxyImage from '@/components/ProxyImage';

import {
  BOOK_COVER_LIFT,
  BOOK_SPINE_OVERLAY,
  LIBRARY_BUTTON,
  LIBRARY_FOCUS,
  LIBRARY_MUTED,
  LIBRARY_PANEL,
  LIBRARY_SERIF,
} from './library';

/**
 * 进度可能来自 CFI 比例或章节下标，原样打印是一长串小数；
 * 小数位保留两位，整数则不加小数点尾巴。
 */
function formatProgressLabel(progress: number) {
  return Number.isInteger(progress) ? String(progress) : progress.toFixed(2);
}

/**
 * 书签台上摊开的那一本：书库首页顶部的大卡，一眼看到在读的书与进度。
 *
 * 整张卡是一个链接，右侧的「继续阅读」是链接内的视觉按钮（span），
 * 这样在触摸设备和键盘上都只有一次点击目标。
 */
export default function ContinueReadingCard({
  eyebrow = '正在读',
  title,
  image,
  meta,
  progress,
  href,
  onNavigate,
  ctaLabel = '继续阅读',
  className,
}: {
  eyebrow?: string;
  title: string;
  image?: string;
  /** 一行次要信息：来源 · 章节 · 页数 */
  meta?: string;
  /** 0..100，缺省则不渲染进度条 */
  progress?: number;
  href: string;
  onNavigate?: () => void;
  ctaLabel?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-label={`${ctaLabel} ${title}`}
      className={cn(
        'group flex gap-4 p-4 transition-colors duration-200 hover:border-library-ochre/45 dark:hover:border-library-night-ochre/45 sm:gap-5 sm:p-5',
        LIBRARY_PANEL,
        LIBRARY_FOCUS,
        className
      )}
    >
      <div
        className={cn(
          'relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-sm bg-library-ochre-tint dark:bg-library-night-ochre-tint sm:w-28',
          BOOK_COVER_LIFT
        )}
      >
        {image ? (
          <ProxyImage
            originalSrc={image}
            alt={title}
            draggable={false}
            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]'
          />
        ) : (
          <div
            className={cn(
              'flex h-full items-center justify-center text-xs',
              LIBRARY_MUTED
            )}
          >
            暂无封面
          </div>
        )}
        <span className={BOOK_SPINE_OVERLAY} aria-hidden />
      </div>

      <div className='flex min-w-0 flex-1 flex-col justify-between gap-3'>
        <div className='min-w-0'>
          <div className='text-[11px] font-medium text-library-ochre dark:text-library-night-ochre'>
            {eyebrow}
          </div>
          <div
            className={cn(
              'mt-1.5 line-clamp-2 text-xl font-semibold leading-snug text-library-ink dark:text-library-night-ink sm:text-2xl',
              LIBRARY_SERIF
            )}
          >
            {title}
          </div>
          {meta && (
            <div className={cn('mt-2 truncate text-xs', LIBRARY_MUTED)}>
              {meta}
            </div>
          )}
        </div>

        <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
          {typeof progress === 'number' && (
            <div className='flex min-w-[8rem] flex-1 items-center gap-3'>
              <div
                className='h-1 flex-1 overflow-hidden rounded-full bg-library-edge dark:bg-library-night-edge'
                role='progressbar'
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className='h-full rounded-full bg-library-ochre dark:bg-library-night-ochre'
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span
                className={cn('shrink-0 text-xs tabular-nums', LIBRARY_MUTED)}
              >
                {formatProgressLabel(progress)}%
              </span>
            </div>
          )}
          <span className={cn(LIBRARY_BUTTON, 'shrink-0')}>{ctaLabel}</span>
        </div>
      </div>
    </Link>
  );
}
