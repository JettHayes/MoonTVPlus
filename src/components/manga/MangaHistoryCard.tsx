'use client';

import { BookOpen, CircleMinus, CirclePlus, Info, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { MangaReadRecord } from '@/lib/manga.types';
import { processImageUrl } from '@/lib/utils';

import {
  mangaReadRecordCardItem,
  mangaRecordReadHref,
  mangaSavedDetailHref,
} from '@/components/media/adapters';
import MediaPressCard from '@/components/media/MediaPressCard';

interface MangaHistoryCardProps {
  item: MangaReadRecord;
  inShelf: boolean;
  onToggleShelf: (item: MangaReadRecord) => void | Promise<void>;
  onDelete: (item: MangaReadRecord) => void | Promise<void>;
}

/** 漫画历史卡：动作清单是这里唯一的领域知识，手势和菜单外观都在 MediaPressCard。 */
export default function MangaHistoryCard({
  item,
  inShelf,
  onToggleShelf,
  onDelete,
}: MangaHistoryCardProps) {
  const router = useRouter();

  const readHref = useMemo(
    () => mangaRecordReadHref(item, '/manga/history'),
    [item]
  );

  const detailHref = useMemo(
    () => mangaSavedDetailHref(item, '/manga/history'),
    [item]
  );

  const goRead = useCallback(() => router.push(readHref), [router, readHref]);

  const actions = useMemo(
    () => [
      {
        id: 'continue-reading',
        label: '继续阅读',
        icon: <BookOpen size={20} />,
        onClick: goRead,
        color: 'primary' as const,
      },
      {
        id: 'detail',
        label: '详情',
        icon: <Info size={20} />,
        onClick: () => router.push(detailHref),
      },
      {
        id: 'toggle-shelf',
        label: inShelf ? '移出书架' : '加入书架',
        icon: inShelf ? <CircleMinus size={20} /> : <CirclePlus size={20} />,
        onClick: () => onToggleShelf(item),
        color: inShelf ? ('danger' as const) : ('default' as const),
      },
      {
        id: 'delete',
        label: '删除',
        icon: <Trash2 size={20} />,
        onClick: () => onDelete(item),
        color: 'danger' as const,
      },
    ],
    [detailHref, goRead, inShelf, item, onDelete, onToggleShelf, router]
  );

  return (
    <MediaPressCard
      item={mangaReadRecordCardItem(item)}
      onPress={goRead}
      title={item.title}
      poster={processImageUrl(item.cover)}
      sourceName={item.sourceName}
      actions={actions}
    />
  );
}
