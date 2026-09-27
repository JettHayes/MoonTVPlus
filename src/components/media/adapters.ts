import { BookListItem, BookReadRecord, BookShelfItem } from '@/lib/book.types';
import {
  MangaReadRecord,
  MangaSearchItem,
  MangaShelfItem,
} from '@/lib/manga.types';

import { MediaCardItem } from './media-card.types';

/**
 * 领域类型 → 展示模型的唯一映射层。
 *
 * 卡片组件保持哑渲染，所有"取哪个字段当副标题 / 有没有进度条"的差异都放在这里，
 * 避免把 union 类型塞进卡片 props。
 */

const clampProgress = (value: number | undefined): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(100, Math.max(0, Math.round(value)));
};

const mangaIdOf = (item: MangaSearchItem | MangaShelfItem) =>
  'id' in item ? item.id : item.mangaId;

const bookIdOf = (item: BookListItem | BookShelfItem) =>
  'id' in item ? item.id : item.bookId;

export const mangaCardItem = (
  item: MangaSearchItem | MangaShelfItem
): MediaCardItem => ({
  key: `${item.sourceId}+${mangaIdOf(item)}`,
  title: item.title,
  image: item.cover,
  meta: item.sourceName,
  subtitle: item.author || item.status || item.description,
  count: 'unreadChapterCount' in item ? item.unreadChapterCount : undefined,
});

/**
 * 漫画历史不渲染进度条——页数信息已经写在副标题里（第 x/y 页）。
 */
export const mangaReadRecordCardItem = (
  record: MangaReadRecord
): MediaCardItem => {
  const pageLabel =
    record.pageCount > 0
      ? `第 ${record.pageIndex + 1}/${record.pageCount} 页`
      : '';
  return {
    key: `${record.sourceId}+${record.mangaId}`,
    title: record.title,
    image: record.cover,
    meta: record.sourceName,
    subtitle: [record.chapterName, pageLabel].filter(Boolean).join(' · '),
  };
};

export const bookCardItem = (
  item: BookListItem | BookShelfItem
): MediaCardItem => ({
  key: `${item.sourceId}-${bookIdOf(item)}`,
  title: item.title,
  image: item.cover,
  meta: item.sourceName,
  subtitle: item.author || '未知作者',
  progress:
    'progressPercent' in item ? clampProgress(item.progressPercent) : undefined,
});

export const bookReadRecordCardItem = (
  record: BookReadRecord
): MediaCardItem => ({
  key: `${record.sourceId}-${record.bookId}`,
  title: record.title,
  image: record.cover,
  meta: record.sourceName,
  subtitle: [record.chapterTitle, record.author].filter(Boolean).join(' · '),
  progress: clampProgress(record.progressPercent),
});

/**
 * 漫画详情 / 阅读地址的唯一构造函数。
 *
 * 详情页与阅读页都从 query 里取这些字段，所以整条链路必须编码一致；以前每个调用点
 * 各拼一遍 encodeURIComponent，改一处就漏一处。returnTo 决定详情页返回键去哪。
 */
interface MangaDetailTarget {
  mangaId: string;
  sourceId: string;
  title: string;
  cover: string;
  sourceName: string;
  description?: string;
  author?: string;
  status?: string;
}

export const mangaDetailHref = (
  target: MangaDetailTarget,
  returnTo: string
): string => {
  const params = new URLSearchParams({
    mangaId: target.mangaId,
    sourceId: target.sourceId,
    title: target.title,
    cover: target.cover,
    sourceName: target.sourceName,
    returnTo,
  });
  if (target.description) params.set('description', target.description);
  if (target.author) params.set('author', target.author);
  if (target.status) params.set('status', target.status);
  return `/manga/detail?${params.toString()}`;
};

export const mangaReadHref = (
  target: {
    mangaId: string;
    sourceId: string;
    chapterId: string;
    title: string;
    cover: string;
    sourceName: string;
    chapterName: string;
  },
  returnTo: string
): string => {
  const params = new URLSearchParams({
    mangaId: target.mangaId,
    sourceId: target.sourceId,
    chapterId: target.chapterId,
    title: target.title,
    cover: target.cover,
    sourceName: target.sourceName,
    chapterName: target.chapterName,
    returnTo,
  });
  return `/manga/read?${params.toString()}`;
};

/** 搜索结果：主键字段是 id。 */
export const mangaItemDetailHref = (
  item: MangaSearchItem,
  returnTo: string
): string =>
  mangaDetailHref(
    {
      mangaId: item.id,
      sourceId: item.sourceId,
      title: item.title,
      cover: item.cover,
      sourceName: item.sourceName,
      description: item.description,
      author: item.author,
      status: item.status,
    },
    returnTo
  );

/** 书架条目与阅读记录：主键字段都是 mangaId，其余字段同名，可以共用。 */
export const mangaSavedDetailHref = (
  item: MangaShelfItem | MangaReadRecord,
  returnTo: string
): string =>
  mangaDetailHref(
    {
      mangaId: item.mangaId,
      sourceId: item.sourceId,
      title: item.title,
      cover: item.cover,
      sourceName: item.sourceName,
      description: 'description' in item ? item.description : undefined,
      author: 'author' in item ? item.author : undefined,
      status: 'status' in item ? item.status : undefined,
    },
    returnTo
  );

/** 阅读记录：继续阅读直接进阅读页。 */
export const mangaRecordReadHref = (
  record: MangaReadRecord,
  returnTo: string
): string =>
  mangaReadHref(
    {
      mangaId: record.mangaId,
      sourceId: record.sourceId,
      chapterId: record.chapterId,
      title: record.title,
      cover: record.cover,
      sourceName: record.sourceName,
      chapterName: record.chapterName,
    },
    returnTo
  );
