'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';

import {
  MUSIC_MENU,
  MUSIC_MENU_CHECK,
  MUSIC_MENU_ITEM,
  MUSIC_MENU_ITEM_ACTIVE,
  MUSIC_MENU_ITEM_IDLE,
  MUSIC_MONOGRAM,
  MUSIC_SWITCH,
  MUSIC_SWITCH_CARET,
  MUSIC_SWITCH_KEY,
  MUSIC_SWITCH_VALUE,
} from './tokens';

export interface MusicSwitchOption<T extends string> {
  key: T;
  label: string;
  /** 标识方块里那两个字。不给就不画方块（比如"类型"这种没有固有缩写的）。 */
  monogram?: string;
}

/**
 * 「乙 · 标识下拉」——音乐模块里所有"从几个里挑一个"的控件都走它。
 *
 * 触发器是一段字段名 + 一条竖线 + 当前取值 + 一个真箭头。菜单里每一项也带
 * 同一块标识方块：方块回答"这是哪一个"，主题色只回答"选中了它"——身份和
 * 状态不共用同一个通道，扫一眼就能分清哪块是名字、哪块是状态。
 */
export default function MusicSwitch<T extends string>({
  field,
  value,
  options,
  onChange,
  className,
}: {
  /** 触发器左侧的字段名（"音源" / "类型"）。 */
  field: string;
  value: T;
  options: ReadonlyArray<MusicSwitchOption<T>>;
  onChange: (next: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.key === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className={cn('relative', className)}>
      <button
        type='button'
        onClick={() => setOpen((prev) => !prev)}
        className={MUSIC_SWITCH}
        aria-haspopup='listbox'
        aria-expanded={open}
      >
        <span className={MUSIC_SWITCH_KEY}>{field}</span>
        <span className={MUSIC_SWITCH_VALUE}>
          {current?.monogram ? (
            <span className={MUSIC_MONOGRAM}>{current.monogram}</span>
          ) : null}
          {current?.label}
          <ChevronDown className={MUSIC_SWITCH_CARET} strokeWidth={2.5} />
        </span>
      </button>

      {open ? (
        <>
          {/* 透明背板：点空白处关菜单。z 压在菜单下、播放器上。 */}
          <button
            type='button'
            tabIndex={-1}
            aria-label='关闭菜单'
            className='fixed inset-0 z-[55] cursor-default'
            onClick={() => setOpen(false)}
          />
          <div className={MUSIC_MENU} role='listbox'>
            {options.map((option) => {
              const active = option.key === value;
              return (
                <button
                  key={option.key}
                  type='button'
                  role='option'
                  aria-selected={active}
                  onClick={() => {
                    setOpen(false);
                    if (!active) onChange(option.key);
                  }}
                  className={cn(
                    MUSIC_MENU_ITEM,
                    active ? MUSIC_MENU_ITEM_ACTIVE : MUSIC_MENU_ITEM_IDLE
                  )}
                >
                  {option.monogram ? (
                    <span className={MUSIC_MONOGRAM}>{option.monogram}</span>
                  ) : null}
                  <span className='truncate'>{option.label}</span>
                  {active ? (
                    <Check className={MUSIC_MENU_CHECK} strokeWidth={3} />
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
