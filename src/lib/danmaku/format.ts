/**
 * 移除弹幕标题中用【】包裹的来源标记，返回纯净标题。
 * 弹幕源常把来源（平台/字幕组等）用【】包裹放在标题里，展示分集名时应去掉。
 */
export function stripDanmakuSource(title: string | undefined | null): string {
  if (!title) return '';
  return title
    .replace(/【[^】]*】/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 在移除来源标记的基础上，进一步去掉标题中的「第x集 / 第x话 / 第x話」序号，
 * 得到用于选集列表展示的纯净分集名。
 * 若去除后已无实质内容（分集名本身就只是集号），返回空串，调用方可据此降级到 TMDB。
 */
export function cleanEpisodeDisplayName(
  title: string | undefined | null
): string {
  const base = stripDanmakuSource(title);
  if (!base) return '';
  return base
    .replace(/第\s*\d+\s*[集话話]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

