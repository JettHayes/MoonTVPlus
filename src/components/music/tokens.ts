/**
 * 音乐模块「唱片店」视觉语言的唯一定义处。
 *
 * 日间是牛皮纸 + 焦糖，夜间是烧焦的深棕 + 炽橘；榜单卡是唱片套，封面从套子右侧
 * 探出半个身位；歌曲行在播放时转成一张黑胶。色板在 tailwind.config.ts 的
 * colors.music 下，字体由 src/app/music/layout.tsx 里的 next/font 注入。
 * 页面那层底不在这里——那是外壳 MusicClient 自己铺的渐变底，模块不去盖它。
 *
 * 动手改这里之前先读两条边界：
 *
 * 一、**材质归方向，交互归主题色**。黑胶、暖棕、卡纸、窄体字、方角这些写死在
 *     music-* 令牌里，不跟站内主题走；按钮、选中态、焦点环、正在播放那一道线
 *     走 music-theme（= var(--theme-primary)），换主题时跟着变。所以同一处
 *     如果需要"被点亮"，用 MUSIC_*_THEME 那组，别顺手拿 graphite。
 *     套面正中那个大号目录号是例外里的例外：它走 music-accent（方向自带的
 *     焦糖/炽橘）而**不是** music-theme——换站内主题，套面不该整体变色。
 *
 * 二、**不复用 bg-white / bg-zinc-* / bg-gray-***。管理端主题层会对这些类名做
 *     !important 覆盖（src/styles/themes.ts），音乐区只能自成一套命名。
 */

import type { CSSProperties } from 'react';

import { cn } from '@/lib/cn';

/* ------------------------------------------------------------------ *
 * 排版标尺
 * ------------------------------------------------------------------ */

/**
 * 全模块的**一个**缩放像素，铺在 layout.tsx 的根 div 上。
 *
 * 模块里所有字号都不写死 px，写 `text-[calc(15*var(--music-px))]`——15 是它在
 * 手机上的原尺寸，`--music-px` 是"这个 px 现在值多少"。所以整个模块的字是
 * 按同一条曲线一起长、一起缩的，比例恒定，改一个数就是改全模块。
 *
 * 为什么必须有这条曲线：内容区在 1328px 视口处撞到外壳的 max-w-7xl 就不再变宽，
 * 而已有的栅格只会在宽屏上**加列**（xl 到五列，单卡反而缩到 240px）。字却一直
 * 是手机尺寸，宽屏上就是一张大版面上趴着一行小字。曲线在 480px 处起步（1.0），
 * 到 1330px 收在 1.3——之后容器不长了，字也就不再长，两边同时停。
 *
 * 数字怎么来的：`clamp(1px, 0.035vw + 0.832px, 1.3px)`——480px 视口回 1.000px，
 * 1330px 回 1.297px。别改成按 px 加固定值：那会让 8px 的小字涨得比 15px 还多，
 * 比例就散了；这里要的是等比。
 *
 * 只管字。栅格间距、唱片探出的 14px、卡片圆角这些是版面骨架，不跟着视口走
 * （唱片探出写死正是为了在任何断点都不撞进隔壁那张卡）。
 *
 * `--music-px-display` 是第二条曲线，只给"版面主角"用（目前只有套面上的目录号）。
 * 同一条起跑线（480px 处都是 1.0）、同一个收顶位置（1330px），但收在 **1.7** 而不是
 * 1.3——宽屏上普通字长三成，主角要长七成。目录号是这张卡唯一的"画"（热榜卡没有
 * 封面），它得压得住整张版面，不能跟下沿的说明文字一个量级。
 */
export const MUSIC_TYPE_SCALE = {
  '--music-px': 'clamp(1px, 0.035vw + 0.832px, 1.3px)',
  '--music-px-display': 'clamp(1px, 0.082vw + 0.605px, 1.7px)',
} as CSSProperties;

/* ------------------------------------------------------------------ *
 * 页面骨架
 * ------------------------------------------------------------------ */

/**
 * 页面内容层。用 relative，但**不带 z-index**：这样它不产生层叠上下文，
 * 下拉菜单的 z-[60] 才能释放到根层叠上下文里去赢过播放器（z-50）。顺手加个
 * z-index 就自成一档，菜单会被播放器盖住。
 *
 * 模块自己**不铺页面底色**——外壳（MusicClient）已经铺了一层渐变底，页面根
 * 元素是它的后代，铺了也压不住，只会把那层盖掉。日间是浅蓝白渐到淡绿、夜间是
 * 近黑渐到深绿，那本来就是 music 区的底色，跟着站内日夜走。
 */
export const MUSIC_PAGE_BODY = 'relative';

/** 正文主色。 */
export const MUSIC_TEXT = 'text-music-ink dark:text-music-night-ink';

/** 次要信息（时长、作者、说明）。 */
export const MUSIC_MUTED = 'text-music-muted dark:text-music-night-muted';

/** 比主色轻一档的正文，用在套面里的曲目名这种"压在图上"的地方。 */
export const MUSIC_TEXT_SOFT =
  'text-music-ink-soft dark:text-music-night-ink-soft';

/** 窄体无衬线：标题、曲名、套面上的大字。 */
export const MUSIC_DISPLAY = 'font-music-display';

/** 等宽：名次、时长、音源键名、小节标签——凡是需要排成轴的数字都走它。 */
export const MUSIC_MONO = 'font-music-mono';

/** 等宽小标签（"SEARCH"/"共 N 首"这种眉标）。 */
export const MUSIC_LABEL =
  'font-music-mono text-[calc(10*var(--music-px))] uppercase tracking-[0.14em] text-music-muted dark:text-music-night-muted';

/** 统一焦点环，走主题色。 */
export const MUSIC_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-music-theme dark:focus-visible:ring-music-night-theme focus-visible:ring-offset-2 focus-visible:ring-offset-music-paper dark:focus-visible:ring-offset-music-night';

/**
 * 页面顶部那一行：左边标题，右边控件。
 *
 * 这里**不给 z-index**。下拉菜单要压过播放器（z-50），靠的是菜单自己那个
 * z-[60]——页面这一路（外壳 → MusicPage → 这一行）都没人建层叠上下文，所以
 * 菜单的 60 是拿去和顶栏（z-40）、播放器（z-50）比的。要是这一行也写上
 * z-[60]，整行就跟着升到顶栏之上，往下滚的时候标题会盖在固定顶栏上面。
 */
export const MUSIC_BAR =
  'relative mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-music-edge pb-3.5 dark:border-music-night-edge';

/** 页面主标题。窄体 + 大写字距，像唱片内套上印的那行。 */
export const MUSIC_BAR_TITLE =
  'font-music-display text-[calc(26*var(--music-px))] font-semibold uppercase tracking-[0.04em] text-music-ink dark:text-music-night-ink';

/** 标题下那行等宽小字（"侧 A · 网易云"这种）。 */
export const MUSIC_BAR_SUB = MUSIC_LABEL;

/* ------------------------------------------------------------------ *
 * 按钮
 * ------------------------------------------------------------------ */

/**
 * 实心主按钮（播放全部）。填主题色、白字——注意白字走 music-chip 而不是
 * text-white，否则会被管理端主题层染掉。
 */
export const MUSIC_BUTTON = cn(
  'inline-flex items-center gap-2 rounded-[3px] bg-music-theme px-3.5 py-2 font-music-mono text-[calc(11*var(--music-px))] font-semibold uppercase tracking-[0.1em] text-music-chip transition-colors duration-200 hover:bg-music-theme-hover disabled:cursor-not-allowed disabled:opacity-40 dark:bg-music-night-theme dark:hover:bg-music-night-theme-hover',
  MUSIC_FOCUS
);

/** 描边按钮：次要动作（删除歌单、上一页）。 */
export const MUSIC_GHOST_BUTTON = cn(
  'inline-flex items-center gap-2 rounded-[3px] border border-music-edge bg-music-card px-3.5 py-2 font-music-mono text-[calc(11*var(--music-px))] font-semibold uppercase tracking-[0.1em] text-music-ink transition-colors duration-200 hover:border-music-ink-soft hover:text-music-ink-soft disabled:cursor-not-allowed disabled:opacity-40 dark:border-music-night-edge dark:bg-music-night-card dark:text-music-night-ink dark:hover:border-music-night-ink-soft dark:hover:text-music-night-ink-soft',
  MUSIC_FOCUS
);

/** 危险动作（删除）：只在 hover 时泛红，平时和 ghost 一样安静。 */
export const MUSIC_DANGER_BUTTON = cn(
  'inline-flex items-center gap-2 rounded-[3px] border border-music-edge bg-music-card px-3.5 py-2 font-music-mono text-[calc(11*var(--music-px))] font-semibold uppercase tracking-[0.1em] text-music-muted transition-colors duration-200 hover:border-red-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-music-night-edge dark:bg-music-night-card dark:text-music-night-muted dark:hover:border-red-500/60 dark:hover:text-red-400',
  MUSIC_FOCUS
);

/** 行内图标按钮（收藏 / 稍后播放 / 移除）。 */
export const MUSIC_ICON_BUTTON = cn(
  'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-music-muted transition-colors duration-200 hover:bg-music-card-2 hover:text-music-theme dark:text-music-night-muted dark:hover:bg-music-night-card-2 dark:hover:text-music-night-theme',
  MUSIC_FOCUS
);

/** 同上，危险动作。 */
export const MUSIC_ICON_BUTTON_DANGER = cn(
  'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-music-muted transition-colors duration-200 hover:bg-music-card-2 hover:text-red-600 disabled:opacity-40 dark:text-music-night-muted dark:hover:bg-music-night-card-2 dark:hover:text-red-400',
  MUSIC_FOCUS
);

/* ------------------------------------------------------------------ *
 * 音源切换（乙 · 标识下拉）
 * ------------------------------------------------------------------ */

/**
 * 触发器。左边一块键名方块管"这是哪一个"，右边是当前取值加一个真箭头——
 * 身份和状态不共用同一个通道：方块不随选中变色，底下菜单里才用主题色标状态。
 */
export const MUSIC_SWITCH = cn(
  'inline-flex cursor-pointer items-center gap-0 border border-music-edge bg-music-card font-music-mono text-[calc(11*var(--music-px))] leading-none text-music-ink transition-colors duration-150 hover:border-music-ink-soft dark:border-music-night-edge dark:bg-music-night-card dark:text-music-night-ink dark:hover:border-music-night-ink-soft',
  MUSIC_FOCUS
);

/** 触发器左侧字段名（"音源"/"类型"）。 */
export const MUSIC_SWITCH_KEY =
  'border-r border-music-edge px-2 py-[7px] tracking-[0.12em] text-music-muted dark:border-music-night-edge dark:text-music-night-muted';

/** 触发器右侧当前取值。 */
export const MUSIC_SWITCH_VALUE =
  'inline-flex items-center gap-1.5 px-2 py-[7px] font-semibold';

/** 触发器尾部的下拉箭头。 */
export const MUSIC_SWITCH_CARET = 'h-3 w-3 shrink-0 opacity-45';

/** 菜单与菜单项。z-[60] 是为了压过固定播放器（z-50）。 */
export const MUSIC_MENU =
  'absolute right-0 top-[calc(100%+6px)] z-[60] grid w-[168px] gap-0.5 rounded-[4px] border border-music-edge bg-music-paper p-1 shadow-[0_14px_32px_-14px_rgba(0,0,0,0.55)] dark:border-music-night-edge dark:bg-music-night-card';

export const MUSIC_MENU_ITEM = cn(
  'flex w-full cursor-pointer items-center gap-2.5 rounded-[3px] px-2 py-1.5 text-left font-music-mono text-[calc(11*var(--music-px))] text-music-ink transition-colors duration-150',
  MUSIC_FOCUS
);

/**
 * 选中项：只在这里用主题色，方块保持不变——变色的是状态，不是身份。
 * 底色刻意走中性的 card-2 而不是主题色的半透明版：主题色是 var(--theme-primary)，
 * Tailwind 给 var() 颜色加透明度会静默失效（bg-music-theme/12 出来的还是实色），
 * 所以凡是要"变淡的主题色"都得换一种画法，别用斜杠透明度。
 */
export const MUSIC_MENU_ITEM_ACTIVE =
  'bg-music-card-2 font-semibold text-music-theme dark:bg-music-night-card-2 dark:text-music-night-theme';

export const MUSIC_MENU_ITEM_IDLE =
  'hover:bg-music-card-2 dark:hover:bg-music-night-card-2';

/** 菜单项右侧的对勾。 */
export const MUSIC_MENU_CHECK = 'ml-auto h-3 w-3 shrink-0';

/**
 * 键名方块（WY / TX / KW / KG / MG）。酷我和酷狗首字都是"酷"，所以用
 * 平台惯用的两字母缩写而不是首字——缩写才是这几个音源真正的"字"。
 * 它只表示身份，选中与否都不变色。
 */
export const MUSIC_MONOGRAM =
  'grid h-5 w-5 shrink-0 place-items-center rounded-[3px] bg-music-ink-soft/18 font-music-mono text-[calc(9*var(--music-px))] font-semibold tracking-[0.02em] text-music-muted dark:bg-music-night-ink-soft/18 dark:text-music-night-muted';

/* ------------------------------------------------------------------ *
 * 分段控件（甲 · 两三个选项时摊开，比下拉少一次点击）
 * ------------------------------------------------------------------ */

export const MUSIC_SEG =
  'inline-flex items-center gap-0.5 border border-music-edge bg-music-card p-0.5 dark:border-music-night-edge dark:bg-music-night-card';

export const MUSIC_SEG_ITEM = cn(
  'shrink-0 cursor-pointer rounded-[2px] px-2.5 py-1.5 font-music-mono text-[calc(11*var(--music-px))] leading-none text-music-muted transition-colors duration-150 dark:text-music-night-muted',
  MUSIC_FOCUS
);

export const MUSIC_SEG_ITEM_ACTIVE =
  'bg-music-theme font-semibold text-music-chip dark:bg-music-night-theme';

export const MUSIC_SEG_ITEM_IDLE =
  'hover:bg-music-card-2 hover:text-music-ink dark:hover:bg-music-night-card-2 dark:hover:text-music-night-ink';

/* ------------------------------------------------------------------ *
 * 输入框
 * ------------------------------------------------------------------ */

export const MUSIC_FIELD =
  'flex w-full items-center gap-2 border border-music-edge bg-music-card px-3 transition-colors duration-200 focus-within:border-music-theme dark:border-music-night-edge dark:bg-music-night-card dark:focus-within:border-music-night-theme';

export const MUSIC_FIELD_INPUT =
  'w-full border-none bg-transparent py-2.5 font-music-body text-[calc(14*var(--music-px))] text-music-ink outline-none placeholder:text-music-muted focus:outline-none focus:ring-0 dark:text-music-night-ink dark:placeholder:text-music-night-muted';

/* ------------------------------------------------------------------ *
 * 榜单卡 = 唱片套（封面从右侧探出）
 * ------------------------------------------------------------------ */

/**
 * 榜单卡网格。
 *
 * 列数、行距跟 MUSIC_COVER_GRID 对齐——同一个位置在骨架和真内容之间换列数
 * （原来这里少了 xl 那档），加载完会看到整版跳一下。
 *
 * 列间距特意加到 20px：唱片连着外圈那道发丝边一共探出 18px（见 MUSIC_SLEEVE_DISC），
 * 间距必须一直比它宽，唱片才不会伸进隔壁那格底下。两个数都是死尺寸，所以
 * 从手机到宽屏余量恒定。
 */
export const MUSIC_SLEEVE_GRID =
  'grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

/** 卡片的整体外框，只有排版：套面和唱片各自带自己的影子（套面在前，会给唱片投一道影）。 */
export const MUSIC_SLEEVE = 'relative block w-full text-left';

/**
 * 从套子右侧探出的黑胶。
 *
 * 探出量写死 14px，不用百分比。百分比在大屏上会跟着卡片一起长：卡片 300px 时
 * 7% 就是 21px，比列间距还宽——唱片于是钻进隔壁那张卡的封面底下，看着就像
 * "唱片被下一张封面压住了"。固定 14px 配 20px 的列间距，任何断点都留得住。
 *
 * 盘面外那两道圈（3px 页面底色 + 1px 发丝）不是装饰，是这张盘的"直径"：
 * 盘面 #170f08 在夜里压在本就 #16100b 的页面上，少了这两道圈就只剩一条暖黑边，
 * 读起来像套子右边漏了道缝，而不是一张唱片从套口抽出来。做法和歌曲行的
 * MUSIC_ROW_ART 一致——同一张盘，两处都得立得住。外圈再往外 4px，所以实际
 * 探出 18px，列间距还有 2px 余量。
 *
 * 那两道圈的色**必须跟着页面底色走**，不是跟着这张卡：它们是"挖掉一块页面"
 * 露出来的缝。所以取的是页面纸色/边线（日间 #fdf4e9 / #e7d6bd，夜间
 * #16100b / #3a2e21），不是套面的 art 色。
 */
export const MUSIC_SLEEVE_DISC = cn(
  'absolute right-[-14px] top-1/2 aspect-square w-[64%] -translate-y-1/2 rounded-full bg-music-vinyl',
  'shadow-[0_0_0_3px_#fdf4e9,0_0_0_4px_#e7d6bd,0_6px_16px_rgba(0,0,0,0.45)]',
  'dark:shadow-[0_0_0_3px_#16100b,0_0_0_4px_#3a2e21,0_6px_16px_rgba(0,0,0,0.55)]'
);

/**
 * 盘心标签：一圈细边 + 中间那点纸色。
 *
 * 底色和那点白分两个属性写（底色走 background-color，白点走 background-image）。
 * 别合成一句 bg-[radial-gradient(...),#221a12]：Tailwind 见到 gradient 就把它归到
 * background-image，而 `background-image: <渐变>, <颜色>` 是非法值，整条会被浏览器丢掉。
 */
export const MUSIC_SLEEVE_DISC_LABEL =
  'absolute inset-[34%] rounded-full border border-white/20 bg-music-night-card bg-[radial-gradient(circle,#f6ece1_0_26%,transparent_27%)]';

/**
 * 套面。
 *
 * **热榜卡按定义就没有封面**——上游 /leaderboard/boards 回的每一项只有
 * id/name/bangid，五个音源 171 个榜单一个 img 都没有，不是"这次没有图"，是它
 * 永远不会有。所以别把套面当成"一个等着换图的框"：它是一张本来就没印画的套子，
 * 卡面就是版面本身（见 MUSIC_FACE_CAT 那段）。
 *
 * 底色用 music-art 而不是 music-card-2：卡纸得比套子本身深一档，上面印的字才
 * 站得住。不能再浅下去。
 */
export const MUSIC_FACE = cn(
  'absolute inset-0 z-10 flex flex-col justify-between overflow-hidden rounded-[2px] p-2.5',
  'bg-music-art dark:bg-music-night-art',
  // 第三条影子是往右投在唱片上的那道：套面的右缘压着唱片，唱片才像从套口里抽出来
  // 的，而不是"一张黑月牙贴在套子后边"。但它必须**贴着边**——原来写 10px offset /
  // 16px blur，等于拿 62% 的黑把整条月牙盖住：夜里盘面和页面本来就都是黑的，
  // 这么一压就什么都没了，只剩套子右边一道黑缝。收成 2px/4px 的接缝，够读出
  // "套口压着盘"，又不吃掉盘面。
  'shadow-[0_1px_2px_rgba(0,0,0,0.22),0_14px_24px_-16px_rgba(0,0,0,0.5),2px_0_4px_-2px_rgba(0,0,0,0.5),inset_2px_0_0_rgba(255,255,255,0.13),inset_5px_0_9px_-5px_rgba(0,0,0,0.5)]'
);

export const MUSIC_FACE_TOP =
  'relative z-[2] font-music-mono text-[calc(9*var(--music-px))] uppercase tracking-[0.12em] opacity-80';

/**
 * 套面下半摞的那两行（名称 / 更新频率）。
 *
 * mt-2 是给"装不下"的那种卡片兜底的：套面是 flex + justify-between，内容一旦
 * 超过卡高，space-between 会退化回 flex-start，整摞字就贴到上面那行 "Side A"
 * 底下去了。留 8px 就撞不上。
 */
export const MUSIC_FACE_BOTTOM = 'relative z-[2] mt-2 flex flex-col gap-1.5';

/**
 * 名次——这张套面的"目录号"，整张卡的主角。
 *
 * 没有画的套子靠什么认出来？靠印在上面的编号（真实唱片套的脊和角上都是这个）。
 * 热榜卡手上真正有的只有名次和名字，于是把名次放大到 44px 当版面：
 *
 * - **格子会呼吸**：十个榜单十个数，一眼分得清，还自带"编号陈列"的节奏。
 * - **不撒谎**：名次本来就是这张卡上的字，只是从 26px 抬到 44px，不是新编的图形。
 *   之前那版在空位里放月亮、放音符，都是拿一个假图片去填真图片的位置。
 * - **死字号也不怕**：两位数永远放得下，长榜名仍在下沿两行里收着。
 *
 * 下面那道短横把"编号"和名字分成两段，像印刷件上编号底下那条线。
 * 走方向的强调色（日间焦糖 #b45309 / 夜间炽橘 #fb923c）而**不是**主题色：
 * 它是版面记号，不是可点的东西——换了站内主题，套面不该整体变色。
 *
 * 两条位移上的规矩：
 * - **落在 30% 处，不贴左**：`ml-[30%]`。套面上沿的 "Side A" 和下沿的榜名都齐左，
 *   目录号再齐左，整个左缘就堆成一条——而右半边整片空着。往右让出三成，编号占中间，
 *   左边留白给那两行小字，右边留白给探出去的唱片，版面才对得上。
 * - **字号走 display 曲线**（44px → 宽屏 74.8px，见 MUSIC_TYPE_SCALE）：它是这张卡
 *   唯一的"画"，普通字长三成时它得长七成。底下那道短横跟着一起长，短横和编号的比例
 *   才恒定。
 */
export const MUSIC_FACE_CAT = cn(
  'relative z-[2] ml-[30%] self-start font-music-mono text-[calc(44*var(--music-px-display))] font-semibold leading-none tracking-[-0.045em] text-music-accent [font-variant-numeric:tabular-nums] dark:text-music-night-accent',
  'after:mt-[7px] after:block after:h-px after:w-[calc(24*var(--music-px-display))] after:bg-current after:opacity-35 after:content-[""]'
);

/**
 * 套面里的榜单名。
 *
 * 必须 clamp 住：套面是正方形、高度跟着栅格变，字却是死字号。榜单名一长
 * （"QQ音乐·巅峰榜·国风"这种）就会一路往下长，把下沿的小字顶穿。
 * 两行是这套版面的上限。
 */
export const MUSIC_FACE_NAME =
  'line-clamp-2 font-music-display text-[calc(15*var(--music-px))] font-semibold leading-[1.2] tracking-[0.01em]';

/** 更新频率。同理只给一行：接口把 description 当兜底塞进来时不会糊成一团。 */
export const MUSIC_FACE_META =
  'truncate font-music-mono text-[calc(9*var(--music-px))] tracking-[0.1em] opacity-70';

/* ------------------------------------------------------------------ *
 * 歌单卡（有封面的一张方图）
 * ------------------------------------------------------------------ */

export const MUSIC_COVER_GRID =
  'grid grid-cols-2 gap-x-3.5 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

export const MUSIC_COVER = 'block w-full text-left';

/**
 * 封面图。
 *
 * 这个 `block` 不能省。调用处给的是 `<span>`，而 span 默认是**非替换行内盒**——
 * aspect-ratio / overflow / width 这些属性对行内盒一律不生效。少了 block，
 * 方框的高度就不是"等于宽度"，而是**回落到里面那张图自己的比例**：一张 4:3 的
 * 封面就长成 4:3，看着就不是正方形了。图挂了时更糟（里面那个 flex 块直接掉出来）。
 * 同一族的 MUSIC_SINGER_FRAME / MUSIC_PICK_FRAME 同理，各自都带着 block。
 */
export const MUSIC_COVER_FRAME = cn(
  'relative block aspect-square overflow-hidden rounded-[2px] bg-music-art shadow-[0_1px_2px_rgba(0,0,0,0.22),0_14px_24px_-16px_rgba(0,0,0,0.5)]',
  'dark:bg-music-night-art'
);

/**
 * 图挂了。只在 `onError` 之后出现——歌单 / 专辑 / 我的歌单接口都是实打实给图的，
 * "没有图"不是它们的状态，"图没加载出来"才是。
 *
 * 所以它要**难看**：一块空卡纸、一个破图记号、一行小字，灰且扁，没有任何版面。
 * 绝不能长得像热榜卡那张套面（见 MUSIC_FACE_CAT）——那是一张有设计的卡，
 * 图挂了却长得像它，用户就会以为这张歌单是个榜单。
 *
 * 图标是调用处传进来的（lucide 的 ImageOff），这里只管盘子。
 */
export const MUSIC_ART_BROKEN =
  'flex h-full w-full flex-col items-center justify-center gap-1.5 text-music-muted/70 dark:text-music-night-muted/70';

export const MUSIC_ART_BROKEN_LABEL =
  'font-music-mono text-[calc(8*var(--music-px))] tracking-[0.1em] uppercase';

export const MUSIC_COVER_BODY = 'px-0.5 pt-2';
export const MUSIC_COVER_NAME =
  'truncate font-music-display text-[calc(15*var(--music-px))] font-semibold tracking-[0.01em] text-music-ink dark:text-music-night-ink';
export const MUSIC_COVER_META =
  'mt-1 flex items-center justify-between gap-2 font-music-mono text-[calc(10*var(--music-px))] tracking-[0.05em] text-music-muted dark:text-music-night-muted';

/* ------------------------------------------------------------------ *
 * 歌手卡（搜索结果里的圆头像）
 * ------------------------------------------------------------------ *
 * 圆是这套语言里的母题（唱片、盘心、孔），所以歌手用圆框而不是方框——
 * 和歌单卡并排时一眼能分出"这是个人"还是"这是张专辑"。
 */

export const MUSIC_SINGER_GRID =
  'grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7';

export const MUSIC_SINGER = 'group block w-full text-center';

/**
 * 圆框自带一圈底色和一道发丝边，和歌曲行里的那张盘是同一套做法。
 *
 * `block` 的理由同 MUSIC_COVER_FRAME：span 是行内盒，aspect-ratio / w-full /
 * max-w / mx-auto 全不生效，圆框会长成歌手头像自己的比例、也不居中。
 */
export const MUSIC_SINGER_FRAME = cn(
  'relative mx-auto mb-2.5 block aspect-square w-full max-w-[128px] overflow-hidden rounded-full bg-music-art',
  'shadow-[0_1px_2px_rgba(0,0,0,0.22),0_12px_22px_-16px_rgba(0,0,0,0.5)] dark:bg-music-night-art'
);

/** 头像图：hover 时轻微推近，是这一页唯一一处位移，留给它。 */
export const MUSIC_SINGER_PIC =
  'h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06] motion-reduce:transform-none';

export const MUSIC_SINGER_NAME =
  'truncate font-music-display text-[calc(13*var(--music-px))] font-semibold tracking-[0.01em] text-music-ink dark:text-music-night-ink';

export const MUSIC_SINGER_ALIAS =
  'truncate font-music-body text-[calc(11*var(--music-px))] text-music-muted dark:text-music-night-muted';

export const MUSIC_SINGER_META = cn(MUSIC_LABEL, 'mt-1 block text-[calc(9*var(--music-px))]');

/* ------------------------------------------------------------------ *
 * 歌曲行
 * ------------------------------------------------------------------ */

/** 列表上沿是一道实心分割线，像唱片内套上印的那条。 */
export const MUSIC_LIST =
  'mt-4 border-t border-music-ink-soft/45 dark:border-music-night-ink-soft/30';

export const MUSIC_ROW = cn(
  'group relative grid cursor-pointer grid-cols-[22px_34px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[2px] px-2 py-2',
  'md:grid-cols-[28px_36px_minmax(0,1fr)_auto_auto_auto]',
  'transition-colors duration-150 hover:bg-music-card-2/70 dark:hover:bg-music-night-card-2/70'
);

/** 正在播放：左缘一道主题色，底色抬一档，歌名转主题色。 */
export const MUSIC_ROW_PLAYING =
  'bg-music-card-2/70 before:absolute before:bottom-1.5 before:left-0 before:top-1.5 before:w-0.5 before:bg-music-theme before:content-[""] dark:bg-music-night-card-2/70 dark:before:bg-music-night-theme';

export const MUSIC_ROW_INDEX =
  'text-center font-music-mono text-[calc(11*var(--music-px))] text-music-muted [font-variant-numeric:tabular-nums] dark:text-music-night-muted';

/**
 * 歌曲行左边那张封面：一个圆角方形的缩略图，和模块里其它封面
 * （MUSIC_COVER_FRAME / MUSIC_PICK_FRAME）同一套路——先铺一层"这里本该有张图"的
 * 卡纸色，有图就铺满。
 *
 * 方向 A 原本给它套了一张黑胶盘（圆壳 + 转起来的高光 + 盘心孔），但 34px 的尺寸
 * 读不出"唱片"，只读成一堆圆圈；这里退回方形。
 */
export const MUSIC_ROW_ART =
  'relative h-[34px] w-[34px] shrink-0 overflow-hidden rounded-[4px] bg-music-art shadow-[0_1px_2px_rgba(0,0,0,0.22)] dark:bg-music-night-art';

export const MUSIC_ROW_TEXT = 'flex min-w-0 flex-col gap-0.5';

export const MUSIC_ROW_NAME =
  'truncate font-music-body text-[calc(13*var(--music-px))] font-medium tracking-[-0.005em] text-music-ink dark:text-music-night-ink';

/** 正在播放时的歌名，走主题色。 */
export const MUSIC_ROW_NAME_THEME =
  'text-music-theme dark:text-music-night-theme';

export const MUSIC_ROW_ARTIST =
  'truncate font-music-body text-[calc(11*var(--music-px))] text-music-muted dark:text-music-night-muted';

export const MUSIC_ROW_DURATION =
  'hidden font-music-mono text-[calc(11*var(--music-px))] text-music-muted [font-variant-numeric:tabular-nums] md:block dark:text-music-night-muted';

/** 行尾的音源小标签：等宽两字母缩写，不抢戏。 */
export const MUSIC_ROW_SOURCE =
  'hidden shrink-0 font-music-mono text-[calc(10*var(--music-px))] uppercase tracking-[0.1em] text-music-muted/80 md:block dark:text-music-night-muted/80';

export const MUSIC_ROW_ACTIONS = 'flex shrink-0 items-center gap-0.5';

/* ------------------------------------------------------------------ *
 * 播放队列（播放器里的"播放列表"弹窗）
 * ------------------------------------------------------------------ */

/**
 * 弹窗外壳。方角 + 一道描边，跟套面、卡片同一套材质——**不给圆角**。
 * 圆角读成"浮起来的一张卡"，而队列不是卡：它是同一批歌的另一种排法，
 * 该和歌曲行（MUSIC_ROW）长得是一家人，不该另立一种"卡片"。
 */
export const MUSIC_QUEUE_SHELL = cn(
  'flex h-[90vh] max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[4px] border border-music-edge bg-music-paper shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] md:h-auto dark:border-music-night-edge dark:bg-music-night-card'
);

/** 顶栏：底下压一道实心线，和页面标题行（MUSIC_BAR）同一个手法。 */
export const MUSIC_QUEUE_HEAD =
  'flex shrink-0 items-center justify-between gap-3 border-b border-music-edge px-4 py-3 md:px-5 dark:border-music-night-edge';

export const MUSIC_QUEUE_TITLE =
  'font-music-display text-[calc(17*var(--music-px))] font-semibold uppercase tracking-[0.04em] text-music-ink dark:text-music-night-ink';

export const MUSIC_QUEUE_BODY = 'flex-1 overflow-y-auto p-4 md:p-5';

/**
 * 队列行 = 歌曲行（MUSIC_ROW）最前面多一列握把。握把必须独立成列，
 * 因为**只有它能触发拖拽**，整行点击仍然是"播放这首"——两者不能共用一个热区。
 *
 * 列：握把 / 序号 / 封面 / 歌名 / 音源 / 删除（音源那列窄屏收起，跟歌曲行一致）。
 * 正在播放复用 MUSIC_ROW_PLAYING：左缘一道主题色 + 底色抬一档。
 */
export const MUSIC_QUEUE_ROW = cn(
  'group relative grid cursor-pointer grid-cols-[18px_22px_34px_minmax(0,1fr)_auto] items-center gap-2 rounded-[2px] px-2 py-2',
  'md:grid-cols-[22px_28px_34px_minmax(0,1fr)_auto_auto] md:gap-2.5',
  'transition-colors duration-150 hover:bg-music-card-2/70 dark:hover:bg-music-night-card-2/70'
);

export const MUSIC_QUEUE_GRIP = cn(
  'flex h-8 w-full cursor-grab touch-none items-center justify-center text-music-muted/70 transition-colors hover:text-music-ink active:cursor-grabbing dark:text-music-night-muted/70 dark:hover:text-music-night-ink',
  MUSIC_FOCUS
);

/* ------------------------------------------------------------------ *
 * 标签（歌单分类）
 * ------------------------------------------------------------------ */

export const MUSIC_TAG_GROUP = 'mb-4 last:mb-0';
export const MUSIC_TAG_GROUP_LABEL = cn(MUSIC_LABEL, 'mb-2 block');
export const MUSIC_TAG_WRAP = 'flex flex-wrap gap-1.5';

export const MUSIC_TAG = cn(
  'cursor-pointer rounded-[2px] border px-2.5 py-1 font-music-body text-[calc(12*var(--music-px))] transition-colors duration-150',
  MUSIC_FOCUS
);

export const MUSIC_TAG_ACTIVE =
  'border-music-theme bg-music-theme font-medium text-music-chip dark:border-music-night-theme dark:bg-music-night-theme';

export const MUSIC_TAG_IDLE =
  'border-music-edge bg-music-card text-music-ink hover:border-music-ink-soft dark:border-music-night-edge dark:bg-music-night-card dark:text-music-night-ink dark:hover:border-music-night-ink-soft';

/* ------------------------------------------------------------------ *
 * 首页热搜
 * ------------------------------------------------------------------ */

export const MUSIC_HOT_GRID = 'grid gap-x-3 gap-y-1 md:grid-cols-2';

export const MUSIC_HOT_ITEM = cn(
  'flex min-w-0 cursor-pointer items-center gap-3 rounded-[2px] px-2 py-2.5 text-left transition-colors duration-150 hover:bg-music-card-2 dark:hover:bg-music-night-card-2',
  MUSIC_FOCUS
);

/** 热搜名次：前三名换成主题色，其余留石墨——一眼看出榜单头部。 */
export const MUSIC_HOT_RANK =
  'w-6 shrink-0 text-center font-music-mono text-[calc(12*var(--music-px))] font-semibold text-music-graphite [font-variant-numeric:tabular-nums] dark:text-music-night-graphite';

export const MUSIC_HOT_RANK_TOP =
  'text-music-theme dark:text-music-night-theme';

export const MUSIC_HOT_WORD =
  'truncate font-music-body text-[calc(13*var(--music-px))] text-music-ink dark:text-music-night-ink';

/* ------------------------------------------------------------------ *
 * 侧栏抽屉
 * ------------------------------------------------------------------ */

export const MUSIC_DRAWER_SCRIM =
  'absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm';

export const MUSIC_DRAWER = cn(
  'absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-music-edge bg-music-paper px-5 py-6 shadow-[20px_0_40px_rgba(0,0,0,0.35)]',
  'dark:border-music-night-edge dark:bg-music-night'
);

export const MUSIC_DRAWER_BRAND =
  'grid h-10 w-10 shrink-0 place-items-center rounded-[3px] bg-music-theme text-music-chip dark:bg-music-night-theme';

export const MUSIC_DRAWER_TITLE =
  'font-music-display text-[calc(17*var(--music-px))] font-semibold uppercase tracking-[0.06em] text-music-ink dark:text-music-night-ink';

export const MUSIC_DRAWER_SUB = cn(MUSIC_LABEL, 'text-[calc(9*var(--music-px))]');

export const MUSIC_DRAWER_ITEM = cn(
  'group flex w-full cursor-pointer items-center gap-3.5 rounded-[2px] px-3 py-3 text-left transition-colors duration-200',
  MUSIC_FOCUS
);

/** 选中项：一道主题色竖线 + 底色，不用渐变和阴影。 */
export const MUSIC_DRAWER_ITEM_ACTIVE =
  'bg-music-card-2 text-music-theme dark:bg-music-night-card-2 dark:text-music-night-theme';

export const MUSIC_DRAWER_ITEM_IDLE =
  'text-music-muted hover:bg-music-card-2 hover:text-music-ink dark:text-music-night-muted dark:hover:bg-music-night-card-2 dark:hover:text-music-night-ink';

export const MUSIC_DRAWER_LABEL = 'font-music-body text-[calc(13*var(--music-px))] font-medium';

/** 选中项左缘那道竖线，用 after 伪元素画，免得行内再塞一个盒子。 */
export const MUSIC_DRAWER_MARK =
  'ml-auto h-1.5 w-1.5 rounded-full bg-music-theme dark:bg-music-night-theme';

/* ------------------------------------------------------------------ *
 * 我的歌单：左栏那一列可选的歌单
 * ------------------------------------------------------------------ *
 * 行本身和抽屉里那条共用 MUSIC_DRAWER_ITEM（都是"左栏里的一个去处"），
 * 这里只补它多的两样：一张封面缩略图和一行说明。
 */

/** 同上：现在挂在 flex 行里本来就会被块化，但跨出那个上下文（换到普通块里）就是行内盒，
 *  h-11 / w-11 / overflow 会一起失效，所以 display 自己带着，别指望父容器。 */
export const MUSIC_PICK_FRAME =
  'relative block h-11 w-11 shrink-0 overflow-hidden rounded-[2px] bg-music-art dark:bg-music-night-art';

export const MUSIC_PICK_DESC = cn(MUSIC_DRAWER_LABEL, 'truncate text-[calc(11*var(--music-px))]', MUSIC_MUTED);

/* ------------------------------------------------------------------ *
 * 骨架 / 空态 / 分页
 * ------------------------------------------------------------------ */

export const MUSIC_SKELETON =
  'animate-pulse rounded-[2px] bg-music-card-2 dark:bg-music-night-card-2';

/**
 * 空态。
 *
 * **不画框、不铺底。** 之前是虚线边框 + 半透明卡底，就是那种一眼认得出的
 * "占位符盒子"：它跟套面、歌曲行抢同一套材质语言，可空态本身不是内容，
 * 不该长得像内容。现在只剩居中的两行字（可选一个图标），压在页面自己的底色上，
 * 说清楚"这里没有东西"就够了。
 *
 * 所以也别再给它加回边框或背景——要强调的话，让标题那行字重一点，不要加框。
 */
export const MUSIC_EMPTY =
  'flex flex-col items-center justify-center gap-2 px-6 py-14 text-center';

export const MUSIC_EMPTY_TITLE =
  'font-music-display text-[calc(15*var(--music-px))] font-semibold tracking-[0.01em] text-music-ink-soft dark:text-music-night-ink-soft';

export const MUSIC_EMPTY_HINT = cn(
  'font-music-body text-[calc(12*var(--music-px))]',
  MUSIC_MUTED
);

export const MUSIC_PAGER = 'mt-8 flex items-center justify-center gap-3';

export const MUSIC_PAGER_TEXT =
  'font-music-mono text-[calc(11*var(--music-px))] tracking-[0.08em] text-music-muted dark:text-music-night-muted';

/** 计数徽标（"共 N 首"），方角、描边、等宽。 */
export const MUSIC_COUNT =
  'shrink-0 border border-music-edge px-2 py-0.5 font-music-mono text-[calc(10*var(--music-px))] tracking-[0.08em] text-music-muted dark:border-music-night-edge dark:text-music-night-muted';

/* ------------------------------------------------------------------ *
 * 返回键（手机上的"进入 / 返回"层级）
 * ------------------------------------------------------------------ */

/**
 * 单行返回键。手机上进到子视图之后（歌单曲目这类），用它退回上一屏——
 * 退的是这一页自己的层级，不是浏览器历史，所以是按钮不是链接。
 *
 * 方角、等宽小号字、字距拉到 0.14em，跟标签（MUSIC_LABEL）同一路，只多一个箭头。
 * 不铺底色，hover 才抬一档：它坐在标题上面，再给它一层底色就等于又开一张"卡"。
 * `-ml-2` 抵掉左内边距，让箭头和下面的标题左对齐。
 */
export const MUSIC_BACK_BUTTON = cn(
  'inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] -ml-2 px-2 py-1 font-music-mono text-[calc(10*var(--music-px))] uppercase tracking-[0.14em] text-music-muted transition-colors duration-200 hover:text-music-theme dark:text-music-night-muted dark:hover:text-music-night-theme',
  MUSIC_FOCUS
);
