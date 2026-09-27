import { cn } from '@/lib/cn';

import { LIBRARY_MUTED, LIBRARY_SERIF } from './library';

/**
 * 区块标题。书库语言：衬线标题 + 一路延伸到底的细线，像目录上的分节。
 */
export default function MediaSectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className='flex items-baseline gap-3'>
        <h2
          className={cn(
            'shrink-0 text-lg font-semibold text-library-ink dark:text-library-night-ink',
            LIBRARY_SERIF
          )}
        >
          {title}
        </h2>
        <span
          className='h-px min-w-4 flex-1 bg-library-edge dark:bg-library-night-edge'
          aria-hidden
        />
        {action ? <div className='shrink-0'>{action}</div> : null}
      </div>
      {subtitle && (
        <p className={cn('mt-1.5 text-xs', LIBRARY_MUTED)}>{subtitle}</p>
      )}
    </div>
  );
}
