/**
 * Capacitor Preferences 原生存储层
 * 
 * 策略：内存缓存 + 双写（Preferences + localStorage）
 * - 启动时从 Preferences 加载所有数据到内存
 * - 读操作：从内存缓存（同步）
 * - 写操作：更新内存 + 异步写 Preferences + 同步写 localStorage（备份）
 * - 这样不改动任何调用代码，同时保证数据在原生环境持久化
 */

import { Preferences } from '@capacitor/preferences';

const PREFIX = 'sx_';
const ALL_KEYS = [
  'templates', 'dayCanvases', 'flashNotes', 'settings',
  'correctionCases', 'templatesApplied', 'carriedOver',
  'insightCaches', 'weeklyInsight',
];

// 内存缓存
const cache: Record<string, unknown> = {};
let initialized = false;

/**
 * 检测是否在 Capacitor 原生环境
 */
function isNative(): boolean {
  try {
    return (window as any).Capacitor?.isNativePlatform() === true;
  } catch {
    return false;
  }
}

/**
 * 应用启动时调用：从 Preferences 加载所有数据到内存
 */
export async function initNativeStorage(): Promise<void> {
  if (initialized) return;

  const isCapacitor = isNative();
  console.log(`[Storage] Native: ${isCapacitor}, initializing...`);

  for (const key of ALL_KEYS) {
    const fullKey = PREFIX + key;
    let value: unknown = null;

    // 1. 优先从 Preferences 读取
    if (isCapacitor) {
      try {
        const { value: raw } = await Preferences.get({ key: fullKey });
        if (raw !== null) {
          value = JSON.parse(raw);
          cache[key] = value;
          continue;
        }
      } catch (e) {
        console.warn(`[Storage] Preferences read failed for ${key}:`, e);
      }
    }

    // 2. 从 localStorage 读取（降级/迁移）
    try {
      const raw = localStorage.getItem(fullKey);
      if (raw !== null) {
        value = JSON.parse(raw);
        cache[key] = value;

        // 如果是 Capacitor 环境，将 localStorage 数据迁移到 Preferences
        if (isCapacitor) {
          try {
            await Preferences.set({ key: fullKey, value: raw });
            console.log(`[Storage] Migrated ${key} to Preferences`);
          } catch (e) {
            console.warn(`[Storage] Migration failed for ${key}:`, e);
          }
        }
      }
    } catch (e) {
      console.warn(`[Storage] localStorage read failed for ${key}:`, e);
    }
  }

  initialized = true;
  console.log('[Storage] Initialized');
}

/**
 * 同步读取（从内存缓存）
 */
export function nativeLoad<T>(key: string, fallback: T): T {
  if (!initialized && !isNative()) {
    // 浏览器环境且未初始化：直接从 localStorage 读
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch { /* ignore */ }
    return fallback;
  }

  const value = cache[key];
  if (value !== undefined) return value as T;

  // 缓存未命中，尝试 localStorage（降级）
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      cache[key] = parsed;
      return parsed as T;
    }
  } catch { /* ignore */ }

  return fallback;
}

/**
 * 写入：更新内存 + Preferences（原生）+ localStorage（备份）
 */
export function nativeSave(key: string, value: unknown): void {
  const fullKey = PREFIX + key;
  const json = JSON.stringify(value);

  // 1. 更新内存缓存
  cache[key] = value;

  // 2. 写入 Preferences（原生）
  if (isNative()) {
    Preferences.set({ key: fullKey, value: json }).catch(e => {
      console.warn(`[Storage] Preferences write failed for ${key}:`, e);
    });
  }

  // 3. 写入 localStorage（备份）
  try {
    localStorage.setItem(fullKey, json);
  } catch (e) {
    console.warn(`[Storage] localStorage write failed for ${key}:`, e);
  }
}

/**
 * 删除
 */
export function nativeRemove(key: string): void {
  const fullKey = PREFIX + key;
  delete cache[key];

  if (isNative()) {
    Preferences.remove({ key: fullKey }).catch(() => {});
  }

  try {
    localStorage.removeItem(fullKey);
  } catch { /* ignore */ }
}

/**
 * 清理所有数据
 */
export function nativeClear(): void {
  for (const key of ALL_KEYS) {
    nativeRemove(key);
  }
}
