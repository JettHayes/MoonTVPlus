import { cn } from '@/lib/cn';

import { LIBRARY_MUTED, LIBRARY_SERIF } from './library';

/**
 * 空态与错误态。
 *
 * 空态一律**不加边框、不加纸面底**：居中的中型图标 + 一句指示即可。带线白底的
 * 占位符看起来像未填充的表单，是最典型的 AI 生成痕迹，这里刻意去掉。
 * 错误态是另一回事——它需要显眼，保留红色描边横幅。
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'default',
  className,
}: {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  tone?: 'default' | 'error';
  className?: string;
}) {
  if (tone === 'error') {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-300/70 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-950/25 dark:text-red-300',
          className
        )}
      >
        <span className='min-w-0'>{description || title}</span>
        {action ? <div className='flex flex-wrap gap-3'>{action}</div> : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center px-4 py-14 text-center',
        className
      )}
    >
      {icon ? (
        <div className='flex h-14 w-14 items-center justify-center rounded-full bg-library-ochre-tint text-library-ochre dark:bg-library-night-ochre-tint dark:text-library-night-ochre'>
          {icon}
        </div>
      ) : null}
      {title ? (
        <div
          className={cn(
            'mt-4 text-base font-semibold text-library-ink dark:text-library-night-ink',
            LIBRARY_SERIF
          )}
        >
          {title}
        </div>
      ) : null}
      {description ? (
        <p className={cn('mt-1.5 max-w-md text-sm leading-6', LIBRARY_MUTED)}>
          {description}
        </p>
      ) : null}
      {action ? (
        <div className='mt-5 flex flex-wrap justify-center gap-3'>{action}</div>
      ) : null}
    </div>
  );
}
