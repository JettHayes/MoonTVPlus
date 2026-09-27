import { cn } from '@/lib/cn';

// 图片占位符组件 - 实现骨架屏效果（支持暗色模式）
// 微光动画与 CSS 变量统一定义在 src/app/globals.css，
// 避免每个实例各吐一份 <style>（24 张骨架曾会重复 24 遍 keyframes）
const ImagePlaceholder = ({
  aspectRatio,
  className,
}: {
  aspectRatio: string;
  className?: string;
}) => (
  <div
    className={cn('w-full rounded-lg', aspectRatio, className)}
    style={{
      background:
        'linear-gradient(90deg, var(--skeleton-color) 25%, var(--skeleton-highlight) 50%, var(--skeleton-color) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shine 1.5s infinite',
    }}
  />
);

export { ImagePlaceholder };
