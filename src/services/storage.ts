import type { GridTemplate, DayCanvas, CanvasEntry, FlashNote, AppSettings, CorrectionCase, ExportData, InsightCache } from '@/types/models';
import { DEFAULT_TEMPLATE, DEFAULT_SETTINGS, generateId } from '@/types/models';
import { nativeLoad, nativeSave, nativeClear, initNativeStorage } from './nativeStorage';

// 导出初始化函数（在 main.tsx 中调用）
export { initNativeStorage };

const KEYS = {
  templates: 'templates',
  dayCanvases: 'dayCanvases',
  flashNotes: 'flashNotes',
  settings: 'settings',
  correctionCases: 'correctionCases',
  templatesApplied: 'templatesApplied',
  carriedOverDates: 'carriedOver',
  insightCaches: 'insightCaches',
};

// ========== Templates ==========
export function loadTemplates(): GridTemplate[] { return nativeLoad(KEYS.templates, [DEFAULT_TEMPLATE]); }
export function saveTemplates(t: GridTemplate[]) { nativeSave(KEYS.templates, t); }

// ========== Day Canvases ==========
export function loadDayCanvases(): DayCanvas[] { return nativeLoad(KEYS.dayCanvases, []); }
export function saveDayCanvases(c: DayCanvas[]) { nativeSave(KEYS.dayCanvases, c); }
export function getDayCanvas(dateKey: string): DayCanvas | undefined { return loadDayCanvases().find(c => c.date === dateKey); }

export function upsertDayCanvas(canvas: DayCanvas) {
  const all = loadDayCanvases();
  const idx = all.findIndex(c => c.date === canvas.date);
  if (idx >= 0) all[idx] = canvas; else all.push(canvas);
  saveDayCanvases(all);
}

// ========== Init Day Canvas ==========
export function initDayCanvas(dateKey: string, template: GridTemplate): DayCanvas {
  let canvas = getDayCanvas(dateKey);
  if (canvas) return canvas;

  canvas = {
    id: generateId(),
    date: dateKey,
    templateName: template.name,
    gridSnapshotJson: JSON.stringify(template.cells),
    entries: [],
  };

  upsertDayCanvas(canvas);
  markTemplateApplied(dateKey);
  return canvas;
}

// ========== Carry Over Todos ==========
export function carryOverTodos(fromDateKey: string, toDateKey: string, template: GridTemplate): CanvasEntry[] {
  const fromCanvas = getDayCanvas(fromDateKey);
  if (!fromCanvas) return [];
  const undone = fromCanvas.entries.filter(e => e.entryType === 'todo' && !e.completedAt);
  if (undone.length === 0) return [];

  const toCanvas = getDayCanvas(toDateKey) || { id: generateId(), date: toDateKey, templateName: template.name, gridSnapshotJson: JSON.stringify(template.cells), entries: [] };
  const carried: CanvasEntry[] = [];

  undone.forEach(entry => {
    const copy: CanvasEntry = {
      ...entry,
      entryId: generateId(),
      source: 'carry_over',
      isCarryOver: true,
      carriedFromDateKey: fromDateKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    toCanvas.entries.push(copy);
    carried.push(copy);
  });

  upsertDayCanvas(toCanvas);
  markCarriedOver(fromDateKey, toDateKey);
  return carried;
}

function markCarriedOver(from: string, to: string) {
  const map = nativeLoad<Record<string, string>>(KEYS.carriedOverDates, {});
  map[from + '->' + to] = '1';
  nativeSave(KEYS.carriedOverDates, map);
}
export function isCarriedOver(from: string, to: string): boolean {
  return !!nativeLoad<Record<string, string>>(KEYS.carriedOverDates, {})[from + '->' + to];
}

// ========== Flash Notes ==========
export function loadFlashNotes(): FlashNote[] { return nativeLoad(KEYS.flashNotes, []); }
export function saveFlashNotes(n: FlashNote[]) { nativeSave(KEYS.flashNotes, n); }
export function getUnassignedFlashNotes(dateKey: string): FlashNote[] {
  return loadFlashNotes().filter(n => n.date === dateKey && !n.finalEntriesJson);
}

// ========== Settings ==========
export function loadSettings(): AppSettings { return { ...DEFAULT_SETTINGS, ...nativeLoad<Partial<AppSettings>>(KEYS.settings, {}) }; }
export function saveSettings(s: AppSettings) { nativeSave(KEYS.settings, s); }

// ========== Correction Cases ==========
export function loadCorrectionCases(): CorrectionCase[] { return nativeLoad(KEYS.correctionCases, []); }
export function saveCorrectionCases(c: CorrectionCase[]) { nativeSave(KEYS.correctionCases, c); }
export function addCorrectionCase(c: CorrectionCase) { saveCorrectionCases([...loadCorrectionCases(), c]); }

// ========== Template Applied Tracking ==========
function markTemplateApplied(dateKey: string) {
  const d = nativeLoad<string[]>(KEYS.templatesApplied, []);
  if (!d.includes(dateKey)) { d.push(dateKey); nativeSave(KEYS.templatesApplied, d); }
}
export function isTemplateApplied(dateKey: string): boolean {
  return nativeLoad<string[]>(KEYS.templatesApplied, []).includes(dateKey);
}

// ========== Stats ==========
export function getStats() {
  const canvases = loadDayCanvases();
  const totalEntries = canvases.reduce((s, c) => s + c.entries.length, 0);
  return { totalEntries, totalDays: canvases.filter(c => c.entries.length > 0).length };
}

// ========== Export / Import ==========
export function exportAllData(): ExportData {
  const s = loadSettings();
  return {
    version: '2.1.0', exportDate: new Date().toISOString(),
    templates: loadTemplates(), dayCanvases: loadDayCanvases(),
    flashNotes: loadFlashNotes(), correctionCases: loadCorrectionCases(),
    settings: (({ apiKey, passwordHash, ...r }) => r)(s) as Partial<AppSettings>,
  };
}

export function importAllData(data: ExportData): { success: boolean; message: string } {
  try {
    if (data.templates) saveTemplates(data.templates);
    if (data.dayCanvases) saveDayCanvases(data.dayCanvases);
    if (data.flashNotes) saveFlashNotes(data.flashNotes);
    if (data.correctionCases) saveCorrectionCases(data.correctionCases);
    return { success: true, message: `导入 ${data.dayCanvases?.length || 0} 天数据` };
  } catch (e) { return { success: false, message: '导入失败' }; }
}

export function clearAllData() { nativeClear(); }

// ========== Insight Cache ==========
export function loadInsightCaches(): InsightCache[] { return nativeLoad(KEYS.insightCaches, []); }
export function saveInsightCaches(c: InsightCache[]) { nativeSave(KEYS.insightCaches, c); }
export function addInsightCache(cache: InsightCache) {
  const all = loadInsightCaches();
  const idx = all.findIndex(c => c.granularity === cache.granularity && c.periodStart === cache.periodStart);
  if (idx >= 0) all[idx] = cache; else all.push(cache);
  saveInsightCaches(all);
}
export function getLatestInsightCache(granularity: string): InsightCache | undefined {
  return loadInsightCaches().filter(c => c.granularity === granularity).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
}
export function getWeeklyAutoRunStatus(): { lastRunWeek: string | null } {
  return nativeLoad('weeklyInsight', { lastRunWeek: null });
}
export function markWeeklyAutoRun(weekKey: string) {
  nativeSave('weeklyInsight', { lastRunWeek: weekKey });
}

// ========== Tag Tree ==========
export function buildTagTree() {
  const tagCount: Record<string, number> = {};
  loadDayCanvases().forEach(c => c.entries.forEach(e => e.tags.forEach(t => tagCount[t] = (tagCount[t] || 0) + 1)));
  const root = { name: 'root', fullPath: '', count: 0, children: [] as any[] };
  Object.entries(tagCount).forEach(([path, count]) => {
    const parts = path.split('/');
    let cur = root, fp = '';
    parts.forEach((p, i) => {
      fp = fp ? `${fp}/${p}` : p;
      let ch = cur.children.find((c: any) => c.name === p);
      if (!ch) { ch = { name: p, fullPath: fp, count: 0, children: [] }; cur.children.push(ch); }
      if (i === parts.length - 1) ch.count = count;
      cur = ch;
    });
  });
  return root;
}
