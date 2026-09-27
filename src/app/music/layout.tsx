import { Archivo, Archivo_Narrow, IBM_Plex_Mono } from 'next/font/google';

import { MUSIC_TYPE_SCALE } from '@/components/music/tokens';

import './music.css';

import MusicClient from './MusicClient';

/**
 * 音乐模块的三副字，和根布局里的 Inter 同一套机制（构建期自托管，不发运行时外链）。
 *
 * 只在 /music 下加载：书库用衬线、影视用 Inter，这几副字不该跟着全站走。
 * 变量名与 tailwind.config.ts 的 fontFamily['music-*'] 一一对应。
 * 中文没有窄体与等宽的正经对应，会落到系统黑体——这几副字的主场本来就是
 * 要排成轴的那些东西：名次、时长、音源键名。
 */
const musicDisplay = Archivo_Narrow({
  subsets: ['latin'],
  variable: '--font-music-display',
  display: 'swap',
});

const musicBody = Archivo({
  subsets: ['latin'],
  variable: '--font-music-body',
  display: 'swap',
});

// IBM Plex Mono 在 Google Fonts 上不是可变字体，得把用到的字重逐个点名。
const musicMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-music-mono',
  display: 'swap',
});

export default function MusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // style 里的 --music-px 是全模块的排版标尺（见 tokens.ts 的 MUSIC_TYPE_SCALE）。
    // 铺在这层而不是页面上：抽屉是 MusicClient 的同级兄弟、不在页面里，铺在页面上
    // 它就取到空值，`calc(N*var(--music-px))` 整条失效、字号退回继承。
    <div
      style={MUSIC_TYPE_SCALE}
      className={`${musicDisplay.variable} ${musicBody.variable} ${musicMono.variable}`}
    >
      <MusicClient>{children}</MusicClient>
    </div>
  );
}
