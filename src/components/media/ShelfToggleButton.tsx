import MediaActionButton from './MediaActionButton';

/**
 * 书架加入/移除按钮。纯展示：持久化仍在各页自己的 store 里。
 */
export default function ShelfToggleButton({
  active,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <MediaActionButton aria-pressed={active} {...props}>
      {children ?? (active ? '移出书架' : '加入书架')}
    </MediaActionButton>
  );
}
