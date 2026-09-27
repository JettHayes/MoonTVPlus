import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 Tailwind 类名：clsx 处理条件类名，twMerge 解决同类冲突（后者胜出）。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
