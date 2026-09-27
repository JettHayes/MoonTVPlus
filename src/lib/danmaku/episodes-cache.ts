import type { DanmakuEpisode } from './types';

/**
 * 弹幕「完整分集列表」的本地缓存。
 *
 * 弹幕主动搜索得到的完整分集列表用于选集面板的列表视图与番号对齐，
 * 但命中弹幕记忆（单集）时拿不到完整列表。这里把成功获取到的完整列表
 * 按视频标题缓存下来，下次进入无需重新搜索即可复用。
 *
 * 采用 LRU 管理：最多保留 10 条，超出时淘汰最久未访问的一条。
 */

const STORAGE_KEY = 'danmaku_episodes_cache';
const MAX_ENTRIES = 10;

interface CacheEntry {
  episodes: DanmakuEpisode[];
  timestamp: number; // 最近一次读/写的时间，用于 LRU 淘汰
}

type CacheMap = Record<string, CacheEntry>;

function readMap(): CacheMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as CacheMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: CacheMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 写入失败（如容量超限）时静默忽略
  }
}

/**
 * 读取指定视频的弹幕完整分集列表缓存；命中时刷新其 LRU 时间戳。
 */
export function getCachedDanmakuEpisodes(
  key: string
): DanmakuEpisode[] | null {
  if (!key) return null;
  const map = readMap();
  const entry = map[key];
  if (!entry || !Array.isArray(entry.episodes) || entry.episodes.length === 0) {
    return null;
  }
  // 命中即视为一次访问，刷新时间戳（LRU）
  entry.timestamp = Date.now();
  map[key] = entry;
  writeMap(map);
  return entry.episodes;
}

/**
 * 写入指定视频的弹幕完整分集列表缓存，并按 LRU 淘汰到最多 10 条。
 */
export function setCachedDanmakuEpisodes(
  key: string,
  episodes: DanmakuEpisode[]
): void {
  if (!key || !Array.isArray(episodes) || episodes.length === 0) return;
  const map = readMap();
  map[key] = { episodes, timestamp: Date.now() };

  const entries = Object.entries(map);
  if (entries.length > MAX_ENTRIES) {
    // 按时间戳降序，保留最近访问的 MAX_ENTRIES 条
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
    const kept = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
    writeMap(kept);
  } else {
    writeMap(map);
  }
}
