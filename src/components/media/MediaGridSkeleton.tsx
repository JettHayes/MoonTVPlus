import MediaCardSkeleton from './MediaCardSkeleton';
import MediaGrid from './MediaGrid';

/**
 * 媒体网格骨架，替代两套功能里各自的 N 个内联骨架块。
 */
export default function MediaGridSkeleton({
  count = 12,
  aspect = '3/4',
  className,
}: {
  count?: number;
  aspect?: '3/4' | '2/3';
  className?: string;
}) {
  return (
    <MediaGrid className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <MediaCardSkeleton key={index} aspect={aspect} />
      ))}
    </MediaGrid>
  );
}
