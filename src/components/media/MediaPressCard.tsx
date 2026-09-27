'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { useLongPress } from '@/hooks/useLongPress';

import ImageViewer from '@/components/ImageViewer';
import MobileActionSheet, {
  type ActionItem,
} from '@/components/MobileActionSheet';

import { MediaCardItem } from './media-card.types';
import MediaCard from './MediaCard';

/**
 * 「长按 / 右键出菜单」的媒体卡片，历史页与书架页共用一套。
 *
 * 卡片上不摆操作按钮：同一个动作在一处是底部按钮、在另一处是菜单项，那是两套行为。
 * 收进菜单之后，小说 / 漫画 × 历史 / 书架四个页面只剩一套手势和一份菜单外观。
 * 具体有哪些动作由调用方给——这个组件不认识任何领域类型，只负责手势、菜单和海报大图。
 */
interface MediaPressCardProps {
  item: MediaCardItem;
  /** 给了 href 则桌面点击走 <Link>（保留新标签页与预取）；触摸短按统一走 onPress */
  href?: string;
  /** 桌面点击 <Link> 时的副作用（如写入路由缓存） */
  onNavigate?: () => void;
  /** 短按 / 回车 / 空格。缺省时若给了 href 则内部跳转 */
  onPress?: () => void;
  /** 菜单标题、海报与来源名 */
  title: string;
  poster?: string;
  sourceName?: string;
  actions: ActionItem[];
}

export default function MediaPressCard({
  item,
  href,
  onNavigate,
  onPress,
  title,
  poster,
  sourceName,
  actions,
}: MediaPressCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);

  const openMenu = useCallback(() => setMenuOpen(true), []);

  // href 有值时 MediaCard 渲染的是 <a>，触摸那一下已被长按手势 preventDefault 掉，
  // 浏览器不会再补一次 click，所以触摸短按必须自己跳转。
  const primaryAction = useCallback(() => {
    if (onPress) {
      onPress();
      return;
    }
    if (href) {
      router.push(href);
    }
  }, [href, onPress, router]);

  const longPressProps = useLongPress({
    onLongPress: openMenu,
    onClick: primaryAction,
    longPressDelay: 500,
  });

  return (
    <>
      {/*
        触摸手势挂在卡片外层：MediaCard 内部只负责鼠标与键盘可达性。
        右键菜单也挂在这一层——卡片是 <a> 还是按钮都无所谓，事件会冒泡上来。
      */}
      <div
        {...longPressProps}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          openMenu();
        }}
        style={{
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
      >
        <MediaCard
          item={item}
          href={href}
          onNavigate={onNavigate}
          interactive={href ? 'link' : 'press'}
          onPress={primaryAction}
        />
      </div>

      <MobileActionSheet
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={title}
        poster={poster}
        sourceName={sourceName}
        actions={actions}
        onPosterClick={() => setPosterOpen(true)}
      />

      {posterOpen && (
        <ImageViewer
          isOpen={posterOpen}
          onClose={() => setPosterOpen(false)}
          imageUrl={poster ?? ''}
          alt={title}
        />
      )}
    </>
  );
}
