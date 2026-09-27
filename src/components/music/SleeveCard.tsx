'use client';

import {
  MUSIC_FACE,
  MUSIC_FACE_BOTTOM,
  MUSIC_FACE_CAT,
  MUSIC_FACE_META,
  MUSIC_FACE_NAME,
  MUSIC_FACE_TOP,
  MUSIC_SLEEVE,
  MUSIC_SLEEVE_DISC,
  MUSIC_SLEEVE_DISC_LABEL,
} from './tokens';

/**
 * 热榜卡 = 一张唱片套，黑胶从右侧探出半个身位。
 *
 * **它没有 cover 这个 prop，因为热榜按定义就没有封面**：上游
 * /leaderboard/boards 回的每一项只有 id/name/bangid，五个音源 171 个榜单一个
 * img 都没有——不是"这次没给"，是它永远不会有。所以这里没有"有图 / 没图"两条
 * 分支，卡面就是版面本身：左上 Side A、中间名次当目录号、下沿名字与更新频率。
 *
 * 别再加回铺图那条路。真想要图，只能拿榜单里第一首歌的专辑封面顶
 * （/leaderboard/list 的每首歌都带 img），代价是每个榜单多一次上游请求；
 * 在那之前，这张卡的样子就是它的设计，而不是"缺了张图"。
 */
export default function SleeveCard({
  rank,
  name,
  meta,
  top,
  onOpen,
}: {
  rank: number;
  name: string;
  /** 套面下沿那行小字（更新频率这类）。 */
  meta?: string;
  /** 套面左上角那行小字（"侧 A · 网易云"）。 */
  top?: string;
  onOpen: () => void;
}) {
  const rankLabel = String(rank).padStart(2, '0');

  return (
    <button type='button' onClick={onOpen} className={MUSIC_SLEEVE}>
      <span className='relative block aspect-square w-full'>
        <span aria-hidden className={MUSIC_SLEEVE_DISC}>
          <span className={MUSIC_SLEEVE_DISC_LABEL} />
        </span>

        <span className={MUSIC_FACE}>
          {top ? <span className={MUSIC_FACE_TOP}>{top}</span> : null}
          {/* 名次就是这张套面的编号：不用 aria-hidden，它本来就是要读的内容。 */}
          <span className={MUSIC_FACE_CAT}>{rankLabel}</span>
          <span className={MUSIC_FACE_BOTTOM}>
            <span className={MUSIC_FACE_NAME}>{name}</span>
            {meta ? <span className={MUSIC_FACE_META}>{meta}</span> : null}
          </span>
        </span>
      </span>
    </button>
  );
}
