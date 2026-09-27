'use client';

import { cn } from '@/lib/cn';

import {
  MUSIC_BAR,
  MUSIC_BAR_SUB,
  MUSIC_BAR_TITLE,
  MUSIC_PAGE_BODY,
  MUSIC_TEXT,
} from './tokens';

/**
 * 音乐模块每个浏览页共用的外壳：顶部那一行（标题 / 眉标 / 右侧控件）。
 *
 * 这里不铺页面底色——底色是外壳（MusicClient）那层渐变底，模块只管内容和字色，
 * 见 tokens.ts 的 MUSIC_PAGE_BODY。
 */
export default function MusicPage({
  title,
  subtitle,
  actions,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** 标题行右侧的控件（音源切换、类型切换这类）。 */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className={cn(MUSIC_PAGE_BODY, MUSIC_TEXT)}>
        <div className={MUSIC_BAR}>
          <div className='min-w-0'>
            <h2 className={MUSIC_BAR_TITLE}>{title}</h2>
            {subtitle ? <p className={MUSIC_BAR_SUB}>{subtitle}</p> : null}
          </div>
          {actions ? (
            // 窄屏上动作会换行到标题下面，所以让它自己也能 wrap，而不是被压扁
            // 或者把这一行撑出横向滚动条。
            <div className='flex min-w-0 flex-wrap items-center justify-end gap-2'>
              {actions}
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </>
  );
}
