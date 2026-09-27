import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'mobile-landscape': {
          raw: '(orientation: landscape) and (max-height: 700px)',
        },
      },
      fontFamily: {
        primary: ['Inter', ...defaultTheme.fontFamily.sans],
        // 书名/小节标题用的"书卷"衬线：拉丁走 Georgia，中文依次落到宋体系。
        book: [
          'Georgia',
          '"Songti SC"',
          '"Noto Serif CJK SC"',
          '"Noto Serif SC"',
          'STSong',
          'SimSun',
          ...defaultTheme.fontFamily.serif,
        ],
        // 音乐模块「唱片店」用的三副字。变量由 src/app/music/layout.tsx 里的
        // next/font 注入（和 Inter 同一套机制，构建期自托管，不发运行时外链）。
        // 中文没有窄体/等宽的正经对应，落到系统黑体——数字和拉丁才是这几副字的主场：
        // 名次、时长、音源键名这些"要排成轴"的地方才是它们干活的地方。
        'music-display': [
          'var(--font-music-display)',
          '"Archivo Narrow"',
          ...defaultTheme.fontFamily.sans,
        ],
        'music-body': [
          'var(--font-music-body)',
          'Archivo',
          ...defaultTheme.fontFamily.sans,
        ],
        'music-mono': [
          'var(--font-music-mono)',
          ...defaultTheme.fontFamily.mono,
        ],
      },
      colors: {
        // 漫画 / 小说专属的"暖纸书库"色板：浅色为纸，深色为墨，强调为赭石。
        // 这里刻意不复用 bg-white / bg-gray-*，因为管理端主题层会对那些类名做
        // !important 覆盖；书库区自成一套色板，不参与全站主题替换。
        library: {
          paper: '#f5f0e6',
          card: '#fdfbf6',
          edge: '#e6dccb',
          ink: '#2a241d',
          muted: '#7b6f5f',
          // 封面覆盖层上的纯白（角标文字、图标）。永远是纯白，不随明暗模式走——
          // 它压在封面图上，换成墨色反而会糊进画面。必须是自有令牌而非 bg-white /
          // text-white，否则会被管理端主题层的 [class*="bg-white"] !important 染掉。
          chip: '#ffffff',
          ochre: '#a8611f',
          'ochre-hover': '#8c5017',
          'ochre-tint': '#f2e5d0',
          night: '#13100d',
          'night-card': '#1e1a15',
          'night-edge': '#37302a',
          'night-ink': '#ece3d5',
          'night-muted': '#9c9083',
          'night-ochre': '#d9924a',
          'night-ochre-tint': '#3a2a17',
        },
        // 音乐模块专属的「唱片店」色板：日间是牛皮纸 + 焦糖，夜间是烧焦的深棕 + 炽橘。
        // 弃用了上一版的黑 + 冷银 + 米白——那套整个在灰阶上，没有一处是亮的。
        // 与 library 同理，刻意不复用 bg-white / bg-zinc-* / bg-gray-*——管理端主题层
        // 会对那些类名做 !important 覆盖，音乐区自成一套色板，不参与全站主题替换。
        //
        // music-theme / music-night-theme 是唯一例外：它指向站内主题色，只给"可操作"
        // 的东西用（按钮、选中态、焦点环、正在播放）。方向管材质，主题色管交互——
        // 换了主题你的歌单还是你的颜色。默认主题的 CSS 是空的，所以兜底色必须写。
        music: {
          paper: '#fdf4e9',
          card: '#fffbf5',
          'card-2': '#f4e7d5',
          edge: '#e7d6bd',
          ink: '#2a1c10',
          'ink-soft': '#5c4a37',
          muted: '#7d6a55',
          // 无封面时的卡纸色：比套面深一档，让"这里本该有张图"读得出来。
          art: '#f0dcc2',
          // 方向自带的石墨：热搜名次这类非交互的"次序"记号，不跟主题走。
          // 刻意留成一支中性暖灰而不是强调色——排名 4 名往后全刷成橘色会吵。
          graphite: '#8a745e',
          // 方向自带的强调：套面正中那个大号目录号。它不是控件，不跟主题走，
          // 和 theme 是两回事——换了站内主题，套面不该整体变色。
          accent: '#b45309',
          // 主题色（可操作控件）。见上方注释，兜底不可省。
          theme: 'var(--theme-primary, #10b981)',
          'theme-hover': 'var(--theme-primary-hover, #059669)',
          // 压在图上的纯白（图标、封面上的字）。永远是纯白，不随明暗走——
          // 它压在封面图上，换成墨色反而糊进画面。必须是自有令牌，否则会被
          // 管理端主题层的 [class*="bg-white"] !important 染掉。
          chip: '#ffffff',
          night: '#16100b',
          'night-card': '#221a12',
          'night-card-2': '#2a2118',
          'night-edge': '#3a2e21',
          'night-ink': '#f6ece1',
          'night-ink-soft': '#cbb8a3',
          'night-muted': '#a08b76',
          'night-art': '#2e2318',
          'night-graphite': '#b09a83',
          'night-accent': '#fb923c',
          'night-theme': 'var(--theme-primary, #10b981)',
          'night-theme-hover': 'var(--theme-primary-hover, #059669)',
        },
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        dark: '#222222',
      },
      keyframes: {
        flicker: {
          '0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%': {
            opacity: '0.99',
            filter:
              'drop-shadow(0 0 1px rgba(252, 211, 77)) drop-shadow(0 0 15px rgba(245, 158, 11)) drop-shadow(0 0 1px rgba(252, 211, 77))',
          },
          '20%, 21.999%, 63%, 63.999%, 65%, 69.999%': {
            opacity: '0.4',
            filter: 'none',
          },
        },
        shimmer: {
          '0%': {
            backgroundPosition: '-700px 0',
          },
          '100%': {
            backgroundPosition: '700px 0',
          },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInFromRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        flicker: 'flicker 3s linear infinite',
        shimmer: 'shimmer 1.3s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-in-out',
        'slide-down': 'slideDown 0.3s ease-in-out',
        'slide-in-from-right': 'slideInFromRight 0.3s ease-out',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        // 黑胶盘面：细密的同心圆纹路打底（压出来的槽），上面叠几道深浅不一的
        // 弧形，拼出"反光在盘上走"的错觉。两层写进同一个值里——它们是同一条
        // background-image 的两个图层，拆成两个 bg-* 类只会互相顶掉。
        //
        // 盘面是烧焦的深棕而不是纯黑：压在暖色的套面旁边，纯黑会读成"一块洞"。
        // 两档取自乙的 --app-disc-lo / --app-disc-hi。
        'music-vinyl':
          'repeating-radial-gradient(circle, transparent 0 2px, rgba(255,255,255,0.05) 2px 3px), conic-gradient(from 40deg, #170f08 0%, #412c17 12%, #1c1208 24%, #120b05 40%, #3a2714 56%, #180f07 72%, #452f18 88%, #170f08 100%)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
} satisfies Config;

export default config;
