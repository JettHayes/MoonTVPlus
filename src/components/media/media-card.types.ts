/**
 * 媒体卡片的展示模型。
 *
 * 这里是漫画与小说两套功能的唯一交汇点：卡片本身不认识任何领域类型，
 * 领域类型到展示模型的映射全部收敛在 adapters.ts。
 */
export interface MediaCardItem {
  /** React key，由调用方在网格中作为 key 使用 */
  key: string;
  title: string;
  /** 已由数据层代理过的封面地址 */
  image?: string;
  /** 左上角角标：热门 / 最新 */
  badge?: string;
  /** 一行次要信息：来源名 | 作者 */
  meta?: string;
  /** 一至两行补充信息：作者 / 状态 / 章节 */
  subtitle?: string;
  /** 0..100，缺省则不渲染进度条 */
  progress?: number;
  /** 漫画未读话数的水波纹角标 */
  count?: number;
}

export interface MediaCardProps {
  item: MediaCardItem;
  /** 缺省表示不可跳转（如历史卡） */
  href?: string;
  onNavigate?: () => void;
  /** 两个功能都用 3/4，不要改成 2/3（会重新裁切所有封面） */
  aspect?: '3/4' | '2/3';
  /**
   * 封面右下角的悬浮操作（书墙与搜索结果里的图标化书架开关）。
   * 渲染在锚点之外，避免按钮嵌进 <a>；位置锚定封面而非整张卡片，
   * 因此不会压到标题。
   */
  overlayAction?: React.ReactNode;
  /**
   * 'press' = 长按 / 右键出菜单，用于历史卡与书架卡。
   * 手势本身在 MediaPressCard，这里只负责把卡片做成可聚焦的按钮。
   */
  interactive?: 'link' | 'press';
  onPress?: () => void;
  className?: string;
}
