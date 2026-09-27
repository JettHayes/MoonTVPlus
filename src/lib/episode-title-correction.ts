/**
 * 「手动矫正标题」的按剧集本地配置。
 *
 * 某部剧集的自动分集标题（TMDB / 弹幕）不准确时，用户可在选集面板的
 * 「手动矫正标题」里按剧集标题做以下矫正，仅对该标题生效：
 *   - disabled:      禁用本剧集（不获取任何分集名，保持数字网格）
 *   - preferDanmaku: 弹幕优先（跳过 TMDB 搜索/拉取，直接用弹幕分集名）
 *   - tmdbId/season: 手动指定 TMDB 剧集与季（覆盖自动解析的 tmdbId 与季号）
 *   - startEpisode:  起始集数——视频第 1 集对应 TMDB 的第几集
 *                    （TMDB 常把多季合在 S1 连续编号，用它把编号对齐；默认 1）
 *
 * 与全局开关 `disableEpisodeTitleFetch` 的区别：全局对所有剧集生效，这里仅针对指定标题。
 *
 * 存储采用 LRU 管理：最多保留 20 条，超出时淘汰最久未访问（读/写）的一条。
 */

const STORAGE_KEY = 'episodeTitleCorrections';
const MAX_ENTRIES = 20;

// 配置变更时派发，供播放页据此重新计算取名逻辑
export const EPISODE_TITLE_CORRECTION_EVENT = 'episodeTitleCorrectionChange';

export interface EpisodeTitleCorrection {
  disabled?: boolean;
  preferDanmaku?: boolean;
  tmdbId?: number;
  season?: number;
  startEpisode?: number;
}

// 存储单元：矫正数据 + 最近访问时间戳（时间戳仅用于 LRU 淘汰，不对外暴露）
interface StoredEntry {
  data: EpisodeTitleCorrection;
  ts: number;
}

type CorrectionMap = Record<string, StoredEntry>;

function readMap(): CorrectionMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as CorrectionMap) : {};
  } catch {
    return {};
  }
}

/**
 * 写入 localStorage。
 * notify=false 用于「读取时刷新 LRU 时间戳」这类静默写入——若此时也派发事件，
 * 监听方（播放页）会回读并再次刷新时间戳，形成事件回环，故读取不派发。
 */
function writeMap(map: CorrectionMap, notify: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 写入失败（如容量超限）时静默忽略
  }
  if (!notify) return;
  try {
    window.dispatchEvent(new Event(EPISODE_TITLE_CORRECTION_EVENT));
  } catch {
    /* ignore */
  }
}

// 按 LRU 淘汰到最多 MAX_ENTRIES 条：超限时按时间戳降序保留最近访问的若干条。
function evict(map: CorrectionMap): CorrectionMap {
  const entries = Object.entries(map);
  if (entries.length <= MAX_ENTRIES) return map;
  entries.sort((a, b) => b[1].ts - a[1].ts);
  return Object.fromEntries(entries.slice(0, MAX_ENTRIES));
}

const EMPTY: EpisodeTitleCorrection = {};

/** 读取指定标题的矫正配置；无则返回空对象。命中时刷新 LRU 时间戳（静默写入）。 */
export function getEpisodeTitleCorrection(
  title: string | undefined | null
): EpisodeTitleCorrection {
  if (!title) return EMPTY;
  const map = readMap();
  const entry = map[title];
  if (!entry || !entry.data) return EMPTY;
  // 命中即视为一次访问，刷新时间戳（LRU）；静默写入，避免事件回环
  entry.ts = Date.now();
  map[title] = entry;
  writeMap(map, false);
  return entry.data;
}

/**
 * 合并写入指定标题的矫正配置（浅合并）；字段传 undefined 表示删除该字段。
 * 合并后若整个配置为空则移除该条目。写入后按 LRU 淘汰到 20 条并派发变更事件。
 */
export function setEpisodeTitleCorrection(
  title: string | undefined | null,
  patch: Partial<EpisodeTitleCorrection>
): void {
  if (!title) return;
  const map = readMap();
  const next: EpisodeTitleCorrection = { ...(map[title]?.data ?? {}), ...patch };
  // 清理假值字段（false / undefined / null），保持存储紧凑
  (Object.keys(next) as (keyof EpisodeTitleCorrection)[]).forEach((k) => {
    const v = next[k];
    if (v === undefined || v === false || v === null) {
      delete next[k];
    }
  });
  if (Object.keys(next).length === 0) {
    delete map[title];
  } else {
    map[title] = { data: next, ts: Date.now() };
  }
  writeMap(evict(map), true);
}
