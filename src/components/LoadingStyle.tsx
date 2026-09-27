'use client';

import { AlertCircle, X } from 'lucide-react';
import { type CSSProperties, type ReactNode } from 'react';

/* 初始化加载动画的三种款式（后台「个性化配置 → 初始化加载样式」可切换）。
 *
 * 三套标记都由这里产出，只是靠 globals.css 里的 html[data-loading-style]
 * 决定显示哪一套 —— 首帧就是正确款式，不会「先闪一下旧版再换成二次元」，
 * 也没有 hydration 不匹配。
 *
 * 旧版那一套各页长得不一样（📺/🎬、😵/⚠️），而且要求跟改动前逐字一致，
 * 所以不由这里生成，各页把原标记通过 legacy 塞进来，这里只负责套上
 * .mtv-load-classic 这层开关。
 */

/* 符阵用的卦位字 */
const LOADING_RUNES = '光影银幕片源剧集播放流媒综艺动漫'.split('');

/* 符阵上升光点。位置/时长必须确定：服务端渲染与客户端水合的标记要一致，
 * 所以用取模哈希代替 Math.random。 */
const LOADING_MOTES = Array.from({ length: 14 }, (_, i) => {
  const r = (n: number) =>
    Math.abs((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1);
  return {
    left: `${(12 + r(1) * 76).toFixed(2)}%`,
    duration: `${(2.6 + r(2) * 2.4).toFixed(2)}s`,
    delay: `${(r(3) * 3).toFixed(2)}s`,
    size: `${(5 + r(4) * 5).toFixed(1)}px`,
  };
});

export interface LoadingStep {
  label: string;
  icon: ReactNode;
}

interface CommonProps {
  /** 阶段条，按顺序排开；activeStepIdx 那一格为「进行中」，之前的算「已完成」 */
  steps: LoadingStep[];
  activeStepIdx: number;
  /** 旧版那一套标记，各页自备 */
  legacy: ReactNode;
  /** 播放器蒙层是深色底：这两款在里面固定走暗色，不跟站点明暗 */
  onDark?: boolean;
}

interface LoadingStyleProps extends CommonProps {
  /** 纯中文的阶段文案，不带 emoji */
  message: string;
}

/** 阶段最多亮到 steps.length，越界时夹住，免得 steps[idx] 取空 */
const clampIdx = (idx: number, len: number) =>
  Math.min(Math.max(idx, 0), Math.max(len - 1, 0));

const runeCountAt = (idx: number, len: number) =>
  len > 0 ? Math.round(((idx + 1) / len) * LOADING_RUNES.length) : 0;

/* 阵底细进度条的填充比例：按当前所在格在序列里的序号等分。旧版进度条就是
 * 搜索/详情 33% → 优选 66% → 就绪 100% 这种等分逻辑，这里推广到两三格：
 * 两格（如「获取详情 → 就绪」）时首格正好落在 50%（正中），不再像老曲线那样
 * 把首格卡在 10% 空着像坏了。 */
const barPctAt = (idx: number, len: number) =>
  len < 1 ? 100 : Math.round(((idx + 1) / len) * 100);

const RuneRing = ({ lit, ember }: { lit: number; ember: boolean }) => (
  <div className='mtv-tal-runes'>
    {LOADING_RUNES.map((char, i) => (
      <span
        key={i}
        className={`mtv-rune${i < lit ? (ember ? ' ember' : ' lit') : ''}`}
        style={
          { '--a': `${(i / LOADING_RUNES.length) * 360}deg` } as CSSProperties
        }
      >
        {char}
      </span>
    ))}
  </div>
);

const TalismanFrame = ({ children }: { children: ReactNode }) => (
  <>
    <div className='mtv-tal-ring mtv-tal-ticks' />
    <div className='mtv-tal-ring mtv-tal-glow' />
    <svg className='mtv-tal-star' viewBox='0 0 100 100'>
      <polygon points='50,7 88,72 12,72' />
      <polygon points='50,93 12,28 88,28' />
    </svg>
    <div className='mtv-tal-ring mtv-tal-dash' />
    <div className='mtv-tal-ring mtv-tal-line' />
    {children}
  </>
);

/** 加载中：方块逐格点亮 + 旋转的符阵 */
export default function LoadingStyle({
  steps,
  activeStepIdx,
  message,
  legacy,
  onDark = false,
}: LoadingStyleProps) {
  const idx = clampIdx(activeStepIdx, steps.length);
  const dark = onDark ? ' mtv-on-dark' : '';

  return (
    <>
      <div className='mtv-load mtv-load-classic'>{legacy}</div>

      {/* 方格 */}
      <div className={`mtv-load mtv-load-grid${dark}`}>
        <div className='mtv-grid'>
          <div className='mtv-grid-panels'>
            {steps.map((step, i) => (
              <div
                key={step.label}
                className={`mtv-panel${i <= idx ? ' on' : ''}${i === idx ? ' cur' : ''}`}
              >
                {step.icon}
                <span>{step.label}</span>
              </div>
            ))}
          </div>
          <p className='mtv-bubble'>{message}</p>
        </div>
      </div>

      {/* 魔法阵 */}
      <div className={`mtv-load mtv-load-talisman${dark}`}>
        <div className='mtv-tal'>
          <div className='mtv-tal-circle'>
            <TalismanFrame>
              <RuneRing lit={runeCountAt(idx, steps.length)} ember={false} />
              {LOADING_MOTES.map((mote, i) => (
                <span
                  key={i}
                  className='mtv-mote'
                  style={
                    {
                      left: mote.left,
                      width: mote.size,
                      height: mote.size,
                      animationDuration: mote.duration,
                      animationDelay: mote.delay,
                    } as CSSProperties
                  }
                />
              ))}
            </TalismanFrame>
            {/* key 换阶段时重挂载，动画才会重播 */}
            <div key={idx} className='mtv-tal-flash go' />
            <div className='mtv-tal-core'>
              <div key={idx} className='mtv-tal-icon pop'>
                {steps[idx]?.icon}
              </div>
            </div>
          </div>
          <div className='mtv-tal-body'>
            <p className='mtv-tal-phrase'>{message}</p>
            {/* 只有整页加载才有进度条。播放器蒙层是换源/换集的短暂过渡，
                「初始化 → 播放」两步之间跨了 90%，摆个进度条是个假指标。 */}
            {!onDark && (
              <div className='mtv-tal-bar'>
                <i style={{ width: `${barPctAt(idx, steps.length)}%` }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

interface LoadingErrorStyleProps extends CommonProps {
  /** 失败原因，交给对话框；红框里那句同样的话由页面自己按款式开关 */
  message: string;
}

/** 失败态：坏死的魔法阵 / 本话到此为止，停在失败那一格 */
export function LoadingErrorStyle({
  steps,
  activeStepIdx,
  message,
  legacy,
  onDark = false,
}: LoadingErrorStyleProps) {
  const idx = clampIdx(activeStepIdx, steps.length);
  const dark = onDark ? ' mtv-on-dark' : '';

  return (
    <>
      <div className='mtv-err-legacy'>{legacy}</div>

      {/* 魔法阵：坏死的阵 */}
      <div className={`mtv-load mtv-load-talisman${dark}`}>
        <div className='mtv-tal mtv-tal-dead'>
          <div className='mtv-tal-circle'>
            <TalismanFrame>
              <RuneRing lit={runeCountAt(idx, steps.length)} ember />
            </TalismanFrame>
            <div className='mtv-tal-core'>
              <div className='mtv-tal-icon'>
                <AlertCircle />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 方格：本话到此为止，停在失败那一格 */}
      <div className={`mtv-load mtv-load-grid${dark}`}>
        <div className='mtv-grid mtv-grid-dead'>
          <div className='mtv-grid-panels'>
            {steps.map((step, i) => (
              <div key={step.label} className='mtv-panel'>
                {i === idx ? <X /> : step.icon}
                <span>{step.label}</span>
              </div>
            ))}
          </div>
          {/* 文案搬进对话框后，红框里那句同样的话就不必再来一遍 */}
          <p className='mtv-bubble'>{message}</p>
        </div>
      </div>
    </>
  );
}
