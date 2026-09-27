'use client';

import Link from 'next/link';

import { cn } from '@/lib/cn';

import ProxyImage from '@/components/ProxyImage';

import {
  BOOK_COVER_LIFT,
  BOOK_SPINE_OVERLAY,
  LIBRARY_FOCUS,
  LIBRARY_MUTED,
  LIBRARY_SERIF,
} from './library';
import { MediaCardProps } from './media-card.types';
import RippleCountBadge from './RippleCountBadge';

/**
 * 漫画与小说共用的媒体卡片，走「暖纸书库」语言：纸面卡片 + 书脊封面 + 衬线书名。
 *
 * 只做渲染，不认识任何领域类型——数据映射见 adapters.ts。
 * 差异通过三处收敛：progress 是标量、封面上的操作走 overlayAction 槽位，
 * 其余全部塞进 meta / subtitle 两个文本行。
 */
export default function MediaCard({
  item,
  href,
  onNavigate,
  aspect = '3/4',
  overlayAction,
  interactive = 'link',
  onPress,
  className,
}: MediaCardProps) {
  const shellClass = cn(
    'group block overflow-hidden rounded-md border border-library-edge bg-library-card transition-colors duration-200',
    'hover:border-library-ochre/45 dark:border-library-night-edge dark:bg-library-night-card dark:hover:border-library-night-ochre/45',
    LIBRARY_FOCUS,
    'focus-visible:ring-inset',
    className
  );

  const content = (
    <>
      <div
        className={cn(
          'relative overflow-hidden bg-library-ochre-tint dark:bg-library-night-ochre-tint',
          BOOK_COVER_LIFT,
          aspect === '3/4' ? 'aspect-[3/4]' : 'aspect-[2/3]'
        )}
      >
        {item.image ? (
          <ProxyImage
            originalSrc={item.image}
            alt={item.title}
            draggable={false}
            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]'
          />
        ) : (
          <div
            className={cn(
              'flex h-full items-center justify-center text-sm',
              LIBRARY_MUTED
            )}
          >
            暂无封面
          </div>
        )}
        <span className={BOOK_SPINE_OVERLAY} aria-hidden />
        {item.badge && (
          <span className='absolute left-2 top-2 rounded-sm bg-library-ink/75 px-1.5 py-0.5 text-[11px] font-medium text-library-paper backdrop-blur-sm dark:bg-black/70 dark:text-library-night-ink'>
            {item.badge}
          </span>
        )}
        {typeof item.count === 'number' && item.count > 0 && (
          <RippleCountBadge count={item.count} />
        )}
      </div>

      <div className='space-y-1 px-2.5 pb-2.5 pt-2'>
        <div
          className={cn(
            // 2.7em = 13px × 1.35 × 2，正好两行：撑高到两行是为了名字短的卡片
            // 也和对面的长名字一样高，但绝不能超过两行——min-height 比两行多出来的
            // 那几像素会让被 -webkit-line-clamp 截掉的第三行从底下露出字头。
            'line-clamp-2 min-h-[2.7em] text-[13px] font-medium leading-[1.35] text-library-ink dark:text-library-night-ink',
            LIBRARY_SERIF
          )}
        >
          {item.title}
        </div>
        {item.meta && (
          <div
            className={cn('truncate text-[11px]', LIBRARY_MUTED)}
            title={item.meta}
          >
            {item.meta}
          </div>
        )}
        {item.subtitle && (
          <div className={cn('line-clamp-2 text-[11px]', LIBRARY_MUTED)}>
            {item.subtitle}
          </div>
        )}
        {typeof item.progress === 'number' && (
          <div
            className='mt-2 h-1 w-full overflow-hidden rounded-full bg-library-edge dark:bg-library-night-edge'
            role='progressbar'
            aria-valuenow={item.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className='h-full rounded-full bg-library-ochre dark:bg-library-night-ochre'
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className='relative flex flex-col gap-2'>
      {href ? (
        <Link
          href={href}
          onClick={onNavigate}
          className={shellClass}
          aria-label={item.title}
        >
          {content}
        </Link>
      ) : interactive === 'press' ? (
        <div
          role='button'
          tabIndex={0}
          aria-label={item.title}
          onClick={onPress}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onPress?.();
            }
          }}
          className={cn(shellClass, 'cursor-pointer')}
        >
          {content}
        </div>
      ) : (
        <div className={shellClass}>{content}</div>
      )}
      {/*
        封面上的悬浮操作。必须渲染在锚点之外（按钮不能嵌进 <a>），
        同时又要对齐封面右下角——所以外面套一层「和封面等宽等高的透明盒子」：
        封面是整卡宽 + aspect-[3/4]，这个盒子 inset-x-0 top-0 加同样的宽高比，
        高度就必然等于封面高度，bottom-2 落在封面上而不是标题上。
        外层 pointer-events-none 避免吃掉卡片点击，内层再收回指针事件。
      */}
      {overlayAction && (
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0',
            aspect === '3/4' ? 'aspect-[3/4]' : 'aspect-[2/3]'
          )}
        >
          <div className='pointer-events-auto absolute bottom-2 right-2 z-10'>
            {overlayAction}
          </div>
        </div>
      )}
    </div>
  );
}
