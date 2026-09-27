import { cn } from '@/lib/cn';

import { BOOK_RAIL, BOOK_SHELF_BOARD } from './library';
import MediaSectionHeader from './MediaSectionHeader';

/**
 * 书架式横向 rail：一排书立在一条木色书架板上。
 *
 * 与网格的区别是浏览方式——rail 用来放"最近/在追"这类短列表，网格用来放全部。
 */
export default function MediaRail({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <MediaSectionHeader title={title} subtitle={subtitle} action={action} />
      <div
        className={cn(
          BOOK_SHELF_BOARD,
          'shadow-[0_6px_12px_-10px_rgba(0,0,0,0.45)]'
        )}
      >
        <div className={BOOK_RAIL}>{children}</div>
      </div>
    </section>
  );
}
