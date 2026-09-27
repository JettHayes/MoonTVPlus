import { ArrowLeft, Disc3, Heart, ListMusic, Search, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { MusicSource } from '@/lib/music/types';

import {
  MUSIC_DRAWER,
  MUSIC_DRAWER_BRAND,
  MUSIC_DRAWER_ITEM,
  MUSIC_DRAWER_ITEM_ACTIVE,
  MUSIC_DRAWER_ITEM_IDLE,
  MUSIC_DRAWER_LABEL,
  MUSIC_DRAWER_MARK,
  MUSIC_DRAWER_SCRIM,
  MUSIC_DRAWER_SUB,
  MUSIC_DRAWER_TITLE,
  MUSIC_ICON_BUTTON,
} from './tokens';

interface MusicSidebarDrawerProps {
  currentSource: MusicSource;
  isOpen: boolean;
  pathname: string | null;
  onClose: () => void;
  onNavigate: (href: string) => void;
}

const musicNavItems = [
  { key: 'rankings', label: '排行榜', href: '/music/rankings', Icon: ListMusic },
  { key: 'songlists', label: '推荐歌单', href: '/music/songlists', Icon: Disc3 },
  { key: 'search', label: '搜索', href: '/music/search', Icon: Search },
  { key: 'my-playlists', label: '我的歌单', href: '/music/my-playlists', Icon: Heart },
];

/**
 * 侧栏抽屉。材质跟浏览页一样（牛皮纸/烧棕 + 焦糖 + 方角），选中态只用主题色那一点，
 * 不再用渐变和光晕——那两层在日间主题下会糊成一块发绿的雾。
 */
export default function MusicSidebarDrawer({
  currentSource,
  isOpen,
  pathname,
  onClose,
  onNavigate,
}: MusicSidebarDrawerProps) {
  if (!isOpen) return null;

  const navigate = (href: string) => {
    onClose();
    onNavigate(href);
  };

  return (
    <div className='fixed inset-0 z-[10000]'>
      <button className={MUSIC_DRAWER_SCRIM} onClick={onClose} aria-label='关闭菜单' />
      <aside className={MUSIC_DRAWER}>
        <div className='mb-8 flex items-center justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-3'>
            <div className={MUSIC_DRAWER_BRAND}>
              <Disc3 className='h-5 w-5' strokeWidth={1.8} />
            </div>
            <div className='min-w-0'>
              <div className={MUSIC_DRAWER_TITLE}>音乐菜单</div>
              <div className={MUSIC_DRAWER_SUB}>Music · Reverse Side</div>
            </div>
          </div>
          <button onClick={onClose} className={MUSIC_ICON_BUTTON} aria-label='关闭'>
            <X className='h-4 w-4' strokeWidth={2} />
          </button>
        </div>

        <nav className='flex flex-col gap-1'>
          {musicNavItems.map((item) => {
            // 搜索要把当前音源一起带上，其余直接走自己的 href。
            // 别拿「没 href 就兜去排行榜」当兜底——那会把漏填的 href 变成一次
            // 静默的错跳：点"我的歌单"跳到排行榜，人在排行榜页上时就像点了没反应。
            const href = item.key === 'search' ? `${item.href}?source=${currentSource}` : item.href;
            const active = item.key === 'rankings'
              ? pathname?.startsWith('/music/rankings') || pathname === '/music'
              : pathname?.startsWith(`/music/${item.key}`);

            return (
              <button
                key={item.key}
                onClick={() => navigate(href)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  MUSIC_DRAWER_ITEM,
                  active ? MUSIC_DRAWER_ITEM_ACTIVE : MUSIC_DRAWER_ITEM_IDLE
                )}
              >
                <item.Icon className='h-4 w-4 shrink-0' strokeWidth={1.9} />
                <span className={MUSIC_DRAWER_LABEL}>{item.label}</span>
                {active ? <span aria-hidden className={MUSIC_DRAWER_MARK} /> : null}
              </button>
            );
          })}
        </nav>

        <div className='mt-auto border-t border-music-edge pt-4 dark:border-music-night-edge'>
          <button
            onClick={() => navigate('/')}
            className={cn(MUSIC_DRAWER_ITEM, MUSIC_DRAWER_ITEM_IDLE)}
          >
            <ArrowLeft className='h-4 w-4 shrink-0' strokeWidth={1.9} />
            <span className={MUSIC_DRAWER_LABEL}>返回主页</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
