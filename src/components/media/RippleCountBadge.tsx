/**
 * 漫画未读话数的水波纹角标。
 *
 * 三个 @keyframes（ping-scale / pulse-scale / badge-scale）定义在
 * src/app/globals.css，并与 ContinueWatching 的更新角标共用——不要删除或改名。
 * 这里只换配色（primary 天蓝 → 书库赭石），不碰动画。
 */
export default function RippleCountBadge({ count }: { count: number }) {
  return (
    <div className='pointer-events-none absolute right-2 top-2 z-20 h-7 w-7'>
      <span
        className='absolute inset-0 rounded-full bg-library-ochre dark:bg-library-night-ochre'
        style={{
          animation: 'ping-scale 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        }}
      />
      <span
        className='absolute inset-0 rounded-full bg-library-ochre dark:bg-library-night-ochre'
        style={{
          animation: 'pulse-scale 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }}
      />
      <span
        className='absolute inset-0 flex items-center justify-center rounded-full bg-library-ochre text-[11px] font-bold text-white shadow-sm dark:bg-library-night-ochre dark:text-library-night'
        style={{ animation: 'badge-scale 2s ease-in-out infinite' }}
      >
        +{count}
      </span>
    </div>
  );
}
