import { cn } from '@/lib/cn';

import { ImagePlaceholder } from '@/components/ImagePlaceholder';

import { BOOK_COVER_LIFT } from './library';

/**
 * 媒体卡片骨架。结构与 MediaCard 一一对应，避免加载完成时的布局跳动。
 */
export default function MediaCardSkeleton({
  aspect = '3/4',
  className,
}: {
  aspect?: '3/4' | '2/3';
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className='overflow-hidden rounded-md border border-library-edge bg-library-card dark:border-library-night-edge dark:bg-library-night-card'>
        <div
          className={cn(
            'bg-library-ochre-tint dark:bg-library-night-ochre-tint',
            BOOK_COVER_LIFT
          )}
        >
          <ImagePlaceholder
            aspectRatio={aspect === '3/4' ? 'aspect-[3/4]' : 'aspect-[2/3]'}
            className='rounded-none'
          />
        </div>
        <div className='space-y-2 px-2.5 pb-2.5 pt-2'>
          <div className='h-3.5 w-3/4 animate-pulse rounded-sm bg-library-edge dark:bg-library-night-edge' />
          <div className='h-3 w-1/2 animate-pulse rounded-sm bg-library-edge dark:bg-library-night-edge' />
        </div>
      </div>
    </div>
  );
}
