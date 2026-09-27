import { cn } from '@/lib/cn';

import { MUSIC_MUTED } from './tokens';

/**
 * 三点音符的等待动画。
 *
 * 音符用方向自带的强调色（焦糖/炽橘）而不是主题色：它是状态提示，不是控件，
 * 跟目录号同一条规矩。字号走全模块的 --music-px，宽屏上跟着一起长。
 */
export default function MusicLoadingIndicator({
  text,
  size = 'md',
  className = '',
}: {
  text?: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const textSize =
    size === 'sm' ? 'text-[calc(11*var(--music-px))]' : 'text-[calc(13*var(--music-px))]';

  return (
    <div className={cn('flex items-center justify-center gap-3', MUSIC_MUTED, className)}>
      <div className='flex items-end gap-1.5'>
        {[0, 1, 2].map((index) => (
          <svg
            key={index}
            className={cn(
              iconSize,
              'text-music-accent dark:text-music-night-accent'
            )}
            fill='currentColor'
            viewBox='0 0 24 24'
            style={{ animation: `music-note-bounce 0.9s ease-in-out ${index * 0.14}s infinite` }}
          >
            <path d='M12 3v11.55A3.98 3.98 0 0010 14c-2.21 0-4 1.34-4 3s1.79 3 4 3 4-1.34 4-3V8h4V3h-6z' />
          </svg>
        ))}
      </div>
      {text ? <span className={cn(textSize, 'font-medium tracking-wide')}>{text}</span> : null}
    </div>
  );
}
