import { cn } from '@/lib/cn';

import { LIBRARY_FOCUS } from './library';

/**
 * 卡片下方的普通操作按钮（非开关型），与 ShelfToggleButton 同一套视觉。
 *
 * 与 ShelfToggleButton 的区别只在语义：这个不输出 aria-pressed。
 */
export default function MediaActionButton({
  tone = 'default',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type='button'
      className={cn(
        'w-full rounded-md border px-3 py-2 text-xs font-medium transition-colors duration-200',
        LIBRARY_FOCUS,
        tone === 'danger'
          ? 'border-library-edge text-library-muted hover:border-red-400 hover:text-red-600 dark:border-library-night-edge dark:text-library-night-muted dark:hover:border-red-500/60 dark:hover:text-red-400'
          : 'border-library-edge text-library-muted hover:border-library-ochre hover:text-library-ochre dark:border-library-night-edge dark:text-library-night-muted dark:hover:border-library-night-ochre dark:hover:text-library-night-ochre',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
