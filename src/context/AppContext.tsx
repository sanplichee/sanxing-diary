import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import type { GridTemplate, DayCanvas, CanvasEntry, FlashNote, AppSettings, Insight, InsightRange, GridCell, InsightCache } from '@/types/models';
import type { ClassifiedItem } from '@/services/aiService';
import { DEFAULT_TEMPLATE, DEFAULT_SETTINGS, generateId, getDateKey } from '@/types/models';
import * as storage from '@/services/storage';
import { classifyFlashMulti, generateInsight as generateInsightSvc } from '@/services/aiService';
import { localClassify } from '@/services/localClassify';
import type { ExportData } from '@/types/models';

function getWeekKey(d: Date): string {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay() || 7;
  if (day !== 1) date.setDate(date.getDate() - day + 1); // Monday
  return getDateKey(date);
}

// ========== State ==========
interface AppState {
  currentDate: Date;
  templates: GridTemplate[];
  currentTemplate: GridTemplate;
  flashNotes: FlashNote[];
  settings: AppSettings;
  insight: Insight | null;
  insightRange: InsightRange;
  isLoading: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
}

type Action =
  | { type: 'SET_DATE'; date: Date }
  | { type: 'SET_TEMPLATE'; template: GridTemplate }
  | { type: 'UPDATE_TEMPLATES'; templates: GridTemplate[] }
  | { type: 'ADD_FLASH'; note: FlashNote }
  | { type: 'UPDATE_FLASH'; note: FlashNote }
  | { type: 'DELETE_FLASH'; id: string }
  | { type: 'SET_SETTINGS'; settings: AppSettings }
  | { type: 'SET_INSIGHT'; insight: Insight | null }
  | { type: 'SET_INSIGHT_RANGE'; range: InsightRange }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SHOW_TOAST'; toast: { message: string; type: 'success' | 'error' | 'info' } }
  | { type: 'HIDE_TOAST' }
  | { type: 'INIT_STATE'; state: Partial<AppState> };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_DATE': return { ...state, currentDate: action.date };
    case 'SET_TEMPLATE': return { ...state, currentTemplate: action.template };
    case 'UPDATE_TEMPLATES': return { ...state, templates: action.templates };
    case 'ADD_FLASH': return { ...state, flashNotes: [...state.flashNotes, action.note] };
    case 'UPDATE_FLASH': return { ...state, flashNotes: state.flashNotes.map(n => n.id === action.note.id ? action.note : n) };
    case 'DELETE_FLASH': return { ...state, flashNotes: state.flashNotes.filter(n => n.id !== action.id) };
    case 'SET_SETTINGS': return { ...state, settings: action.settings };
    case 'SET_INSIGHT': return { ...state, insight: action.insight };
    case 'SET_INSIGHT_RANGE': return { ...state, insightRange: action.range, insight: null };
    case 'SET_LOADING': return { ...state, isLoading: action.loading };
    case 'SHOW_TOAST': return { ...state, toast: action.toast };
    case 'HIDE_TOAST': return { ...state, toast: null };
    case 'INIT_STATE': return { ...state, ...action.state };
    default: return state;
  }
}

const initialState: AppState = {
  currentDate: new Date(), templates: [DEFAULT_TEMPLATE],
  currentTemplate: DEFAULT_TEMPLATE, flashNotes: [],
  settings: { ...DEFAULT_SETTINGS }, insight: null,
  insightRange: 'day', isLoading: false, toast: null,
};

// ========== Context Type ==========
interface AppContextValue {
  state: AppState; dispatch: React.Dispatch<Action>;
  setDate: (d: Date) => void; prevDay: () => void; nextDay: () => void;
  getDayCanvas: (dk?: string) => DayCanvas | undefined;
  getOrInitDayCanvas: (dk: string) => DayCanvas;
  saveCanvasEntry: (dk: string, e: CanvasEntry) => void;
  deleteCanvasEntry: (dk: string, eid: string) => void;
  moveEntry: (dk: string, eid: string, ncid: string) => void;
  updateEntryType: (dk: string, eid: string, nt: 'todo' | 'note') => void;
  updateEntryPlanTime: (dk: string, eid: string, pt: string | null) => void;
  completeTodo: (dk: string, eid: string) => void;
  uncompleteTodo: (dk: string, eid: string) => void;
  carryOverTodos: (from: string, to: string) => CanvasEntry[];
  getUndoneTodos: (dk: string) => CanvasEntry[];
  sendFlashNote: (text: string) => Promise<{ flashId: string; items: ClassifiedItem[] }>;
  confirmFlashItems: (flashId: string, items: ClassifiedItem[]) => void;
  deleteFlashNote: (id: string) => void;
  updateCell: (cell: GridCell) => void;
  updateSettings: (p: Partial<AppSettings>) => void;
  generateInsight: (r: InsightRange, anchorDate?: Date) => Promise<void>;
  setInsightRange: (r: InsightRange) => void;
  showToast: (m: string, t?: 'success' | 'error' | 'info') => void;
  exportData: (f: 'json' | 'markdown') => Promise<string>;
  importData: (json: string) => { success: boolean; message: string };
  clearAllData: () => void;
  switchTemplate: (id: string) => void;
  createTemplate: (name: string, cells?: GridCell[]) => GridTemplate;
  deleteTemplate: (id: string) => void;
  setDefaultTemplate: (id: string) => void;
  loadInsightCaches: () => InsightCache[];
  getTodayEntries: (cid: string) => CanvasEntry[];
  getTodayTotalEntries: () => number;
  getHistoryEntries: (dk: string, cid: string) => CanvasEntry[];
  buildTagTree: () => { name: string; fullPath: string; count: number; children: any[] };
}

const AppContext = createContext<AppContextValue | null>(null);
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// ========== Provider ==========
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Init
  useEffect(() => {
    const templates = storage.loadTemplates();
    const flashNotes = storage.loadFlashNotes();
    const settings = storage.loadSettings();
    dispatch({ type: 'INIT_STATE', state: { templates, currentTemplate: templates.find(t => t.isDefault) || templates[0] || DEFAULT_TEMPLATE, flashNotes, settings } });
  }, []);

  useEffect(() => { storage.saveSettings(state.settings); }, [state.settings]);
  useEffect(() => { storage.saveTemplates(state.templates); }, [state.templates]);

  // Auto-init day canvas on date change
  useEffect(() => {
    const dk = getDateKey(state.currentDate);
    storage.initDayCanvas(dk, state.currentTemplate);
  }, [state.currentDate, state.currentTemplate]);

  const showToast = useCallback((m: string, t: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    dispatch({ type: 'SHOW_TOAST', toast: { message: m, type: t } });
    toastTimer.current = setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 3000);
  }, []);

  const setDate = useCallback((d: Date) => dispatch({ type: 'SET_DATE', date: d }), []);
  const prevDay = useCallback(() => { const d = new Date(state.currentDate); d.setDate(d.getDate() - 1); setDate(d); }, [state.currentDate, setDate]);
  const nextDay = useCallback(() => { const d = new Date(state.currentDate); d.setDate(d.getDate() + 1); setDate(d); }, [state.currentDate, setDate]);

  const getDayCanvas = useCallback((dk?: string) => storage.getDayCanvas(dk || getDateKey(state.currentDate)), [state.currentDate]);
  const getOrInitDayCanvas = useCallback((dk: string) => storage.initDayCanvas(dk, state.currentTemplate), [state.currentTemplate]);
  const getHistoryEntries = useCallback((dk: string, cid: string) => storage.getDayCanvas(dk)?.entries.filter(e => e.gridCellId === cid) || [], []);
  const getTodayEntries = useCallback((cid: string) => getHistoryEntries(getDateKey(state.currentDate), cid), [state.currentDate, getHistoryEntries]);
  const getTodayTotalEntries = useCallback(() => {
    const c = storage.getDayCanvas(getDateKey(state.currentDate));
    return c?.entries.length || 0;
  }, [state.currentDate]);

  const saveCanvasEntry = useCallback((dk: string, e: CanvasEntry) => {
    let c = storage.getDayCanvas(dk);
    if (!c) c = storage.initDayCanvas(dk, state.currentTemplate);
    const idx = c.entries.findIndex(x => x.entryId === e.entryId);
    if (idx >= 0) c.entries[idx] = e; else c.entries.push(e);
    storage.upsertDayCanvas(c);
  }, [state.currentTemplate]);

  const deleteCanvasEntry = useCallback((dk: string, eid: string) => {
    const c = storage.getDayCanvas(dk); if (!c) return;
    c.entries = c.entries.filter(e => e.entryId !== eid);
    if (c.entries.length === 0) { const all = storage.loadDayCanvases().filter(x => x.date !== dk); storage.saveDayCanvases(all); }
    else storage.upsertDayCanvas(c);
  }, []);

  const moveEntry = useCallback((dk: string, eid: string, ncid: string) => {
    const c = storage.getDayCanvas(dk); if (!c) return;
    const idx = c.entries.findIndex(e => e.entryId === eid);
    if (idx >= 0) { c.entries[idx] = { ...c.entries[idx], gridCellId: ncid, wasCorrected: true, updatedAt: new Date().toISOString() }; storage.upsertDayCanvas(c); }
  }, []);

  const updateEntryType = useCallback((dk: string, eid: string, nt: 'todo' | 'note') => {
    const c = storage.getDayCanvas(dk); if (!c) return;
    const idx = c.entries.findIndex(e => e.entryId === eid);
    if (idx >= 0) { c.entries[idx] = { ...c.entries[idx], entryType: nt, wasCorrected: true, updatedAt: new Date().toISOString() }; storage.upsertDayCanvas(c); }
  }, []);

  const updateEntryPlanTime = useCallback((dk: string, eid: string, pt: string | null) => {
    const c = storage.getDayCanvas(dk); if (!c) return;
    const idx = c.entries.findIndex(e => e.entryId === eid);
    if (idx >= 0) { c.entries[idx] = { ...c.entries[idx], planTime: pt, updatedAt: new Date().toISOString() }; storage.upsertDayCanvas(c); }
  }, []);

  const completeTodo = useCallback((dk: string, eid: string) => {
    const c = storage.getDayCanvas(dk); if (!c) return;
    const idx = c.entries.findIndex(e => e.entryId === eid);
    if (idx >= 0) { c.entries[idx] = { ...c.entries[idx], completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; storage.upsertDayCanvas(c); }
  }, []);

  const uncompleteTodo = useCallback((dk: string, eid: string) => {
    const c = storage.getDayCanvas(dk); if (!c) return;
    const idx = c.entries.findIndex(e => e.entryId === eid);
    if (idx >= 0) { c.entries[idx] = { ...c.entries[idx], completedAt: null, updatedAt: new Date().toISOString() }; storage.upsertDayCanvas(c); }
  }, []);

  // Carry over
  const carryOverTodos = useCallback((from: string, to: string) => {
    const carried = storage.carryOverTodos(from, to, state.currentTemplate);
    if (carried.length > 0) showToast(`已结转 ${carried.length} 个待办`, 'success');
    return carried;
  }, [state.currentTemplate, showToast]);

  const getUndoneTodos = useCallback((dk: string) => {
    const c = storage.getDayCanvas(dk);
    return c?.entries.filter(e => e.entryType === 'todo' && !e.completedAt) || [];
  }, []);

  // Flash note with multi-task support
  const sendFlashNote = useCallback(async (text: string) => {
    const dk = getDateKey(state.currentDate);
    const cells = state.currentTemplate.cells;
    const correctionCases = storage.loadCorrectionCases().map(c => ({ inputText: c.inputText, finalEntriesJson: c.finalEntriesJson }));

    let items: ClassifiedItem[];
    if (state.settings.aiEnabled && state.settings.apiKey) {
      try { items = await classifyFlashMulti(text, cells, state.settings.apiKey, state.settings.customBaseUrl || 'https://api.deepseek.com', state.settings.aiModel, correctionCases); }
      catch (err: any) {
        const msg = err?.message || String(err);
        showToast(`AI 拆分失败: ${msg.slice(0, 60)}`, 'error');
        showToast('已切换为本地智能匹配', 'info');
        items = localClassify(text, cells, new Date());
      }
    } else {
      items = localClassify(text, cells, new Date());
    }

    const flashNote: FlashNote = {
      id: generateId(), date: dk, text,
      aiSuggestedJson: JSON.stringify(items),
      finalEntriesJson: null,
      userCorrected: false,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_FLASH', note: flashNote });
    storage.saveFlashNotes([...state.flashNotes, flashNote]);

    return { flashId: flashNote.id, items };
  }, [state.currentDate, state.currentTemplate, state.settings, state.flashNotes]);

  const confirmFlashItems = useCallback((flashId: string, items: ClassifiedItem[]) => {
    const note = state.flashNotes.find(n => n.id === flashId);
    if (!note) return;

    const isCorrected = note.aiSuggestedJson !== JSON.stringify(items);
    if (isCorrected) {
      storage.addCorrectionCase({
        id: generateId(), inputText: note.text,
        aiSuggestedJson: note.aiSuggestedJson || '',
        finalEntriesJson: JSON.stringify(items),
        createdAt: new Date().toISOString(),
      });
    }

    const now = new Date();
    items.forEach(item => {
      const entry: CanvasEntry = {
        entryId: generateId(), gridCellId: item.gridId,
        entryType: item.entryType, planTime: item.planTime, completedAt: null,
        createdAt: note.createdAt, updatedAt: now.toISOString(),
        contentDelta: `<p>${item.text}</p>`, plainPreview: item.text,
        tags: [], source: 'flash', mediaPaths: [],
        isCarryOver: false, carriedFromDateKey: null,
        wasCorrected: isCorrected, aiReason: item.reason,
      };
      saveCanvasEntry(note.date, entry);
    });

    const updated: FlashNote = { ...note, finalEntriesJson: JSON.stringify(items), userCorrected: isCorrected };
    dispatch({ type: 'UPDATE_FLASH', note: updated });
    storage.saveFlashNotes(state.flashNotes.map(n => n.id === flashId ? updated : n));
    showToast(`已归入 ${items.length} 个格子`, 'success');
  }, [state.flashNotes, saveCanvasEntry, showToast]);

  const deleteFlashNote = useCallback((id: string) => {
    dispatch({ type: 'DELETE_FLASH', id });
    storage.saveFlashNotes(state.flashNotes.filter(n => n.id !== id));
  }, [state.flashNotes]);

  const updateCell = useCallback((cell: GridCell) => {
    const templates = state.templates.map(t => ({ ...t, cells: t.cells.map(c => c.cellId === cell.cellId ? cell : c) }));
    dispatch({ type: 'UPDATE_TEMPLATES', templates });
    const cur = templates.find(t => t.id === state.currentTemplate.id);
    if (cur) dispatch({ type: 'SET_TEMPLATE', template: cur });
  }, [state.templates, state.currentTemplate]);

  const updateSettings = useCallback((p: Partial<AppSettings>) => dispatch({ type: 'SET_SETTINGS', settings: { ...state.settings, ...p } }), [state.settings]);

  const generateInsight = useCallback(async (r: InsightRange, anchorDate?: Date) => {
    const date = anchorDate || state.currentDate;
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const weekKey = getWeekKey(date);
      const cacheKey = r === 'week' ? weekKey : getDateKey(date);
      const cached = storage.loadInsightCaches().find(c => c.granularity === r && c.periodStart === cacheKey);

      if (cached && !state.settings.apiKey) {
        dispatch({ type: 'SET_INSIGHT', insight: JSON.parse(cached.contentMarkdown) as Insight });
        return;
      }

      const insight = await generateInsightSvc(r, date, storage.loadDayCanvases(), state.currentTemplate.cells, state.settings.apiKey || '', state.settings.customBaseUrl || 'https://api.deepseek.com', state.settings.aiModel);
      dispatch({ type: 'SET_INSIGHT', insight });

      storage.addInsightCache({
        id: generateId(), granularity: r, periodStart: cacheKey,
        contentMarkdown: JSON.stringify(insight), generatedAt: new Date().toISOString(),
      });
    } finally { dispatch({ type: 'SET_LOADING', loading: false }); }
  }, [state.currentDate, state.currentTemplate, state.settings]);

  const loadInsightCaches = useCallback(() => storage.loadInsightCaches(), []);

  // Auto weekly insight
  useEffect(() => {
    const weekKey = getWeekKey(new Date());
    const status = storage.getWeeklyAutoRunStatus();
    if (status.lastRunWeek !== weekKey && state.settings.aiEnabled && state.settings.apiKey) {
      // Auto-run weekly insight
      generateInsight('week').then(() => {
        storage.markWeeklyAutoRun(weekKey);
        showToast('本周洞察已自动生成', 'success');
      }).catch(() => {});
    }
  }, [state.settings.aiEnabled, state.settings.apiKey]);

  const setInsightRange = useCallback((r: InsightRange) => dispatch({ type: 'SET_INSIGHT_RANGE', range: r }), []);

  const exportData = useCallback(async (f: 'json' | 'markdown') => {
    const data = storage.exportAllData();
    if (f === 'json') return JSON.stringify(data, null, 2);
    return exportMarkdown(data.dayCanvases, state.currentTemplate.cells);
  }, [state.currentTemplate]);

  const importData = useCallback((json: string) => {
    try { const data = JSON.parse(json) as ExportData; const r = storage.importAllData(data);
      if (r.success) { const t = storage.loadTemplates(); const f = storage.loadFlashNotes(); dispatch({ type: 'INIT_STATE', state: { templates: t, currentTemplate: t.find(x => x.isDefault) || t[0], flashNotes: f } }); }
      return r;
    } catch { return { success: false, message: '导入失败' }; }
  }, []);

  const clearAllData = useCallback(() => { storage.clearAllData(); dispatch({ type: 'INIT_STATE', state: { templates: [DEFAULT_TEMPLATE], currentTemplate: DEFAULT_TEMPLATE, flashNotes: [], insight: null } }); }, []);

  // Template management
  const switchTemplate = useCallback((templateId: string) => {
    const t = state.templates.find(x => x.id === templateId);
    if (t) { dispatch({ type: 'SET_TEMPLATE', template: t }); showToast(`已切换到「${t.name}」`, 'success'); }
  }, [state.templates, showToast]);

  const createTemplate = useCallback((name: string, cells?: GridCell[]) => {
    const newTemplate: GridTemplate = {
      id: generateId(), name,
      cells: cells ? cells.map((c, i) => ({ ...c, cellId: `g${i + 1}` })) : state.currentTemplate.cells.map((c, i) => ({ ...c, cellId: `g${i + 1}` })),
      isDefault: false, createdAt: new Date().toISOString(),
    };
    const updated = [...state.templates, newTemplate];
    dispatch({ type: 'UPDATE_TEMPLATES', templates: updated });
    showToast(`模板「${name}」已创建`, 'success');
    return newTemplate;
  }, [state.templates, state.currentTemplate, showToast]);

  const deleteTemplate = useCallback((id: string) => {
    if (state.templates.length <= 1) { showToast('至少保留一个模板', 'error'); return; }
    const t = state.templates.find(x => x.id === id);
    if (t?.isDefault) { showToast('不能删除默认模板', 'error'); return; }
    const updated = state.templates.filter(x => x.id !== id);
    dispatch({ type: 'UPDATE_TEMPLATES', templates: updated });
    if (state.currentTemplate.id === id) {
      const fallback = updated.find(x => x.isDefault) || updated[0];
      dispatch({ type: 'SET_TEMPLATE', template: fallback });
    }
    showToast('模板已删除', 'info');
  }, [state.templates, state.currentTemplate, showToast]);

  const setDefaultTemplate = useCallback((id: string) => {
    const updated = state.templates.map(t => ({ ...t, isDefault: t.id === id }));
    dispatch({ type: 'UPDATE_TEMPLATES', templates: updated });
    showToast('默认模板已设置', 'success');
  }, [state.templates, showToast]);

  const buildTagTree = useCallback(() => storage.buildTagTree(), []);

  const value: AppContextValue = {
    state, dispatch, setDate, prevDay, nextDay, getDayCanvas, getOrInitDayCanvas,
    saveCanvasEntry, deleteCanvasEntry, moveEntry, updateEntryType, updateEntryPlanTime,
    completeTodo, uncompleteTodo, carryOverTodos, getUndoneTodos,
    sendFlashNote, confirmFlashItems, deleteFlashNote, updateCell, updateSettings,
    generateInsight, setInsightRange, showToast, exportData, importData, clearAllData,
    switchTemplate, createTemplate, deleteTemplate, setDefaultTemplate, loadInsightCaches,
    getTodayEntries, getTodayTotalEntries, getHistoryEntries, buildTagTree,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function exportMarkdown(canvases: DayCanvas[], cells: GridCell[]): string {
  const lines: string[] = ['# 三省日记\n'];
  [...canvases].sort((a, b) => b.date.localeCompare(a.date)).forEach(c => {
    if (!c.entries.length) return;
    lines.push(`## ${c.date}\n`);
    c.entries.forEach(e => {
      const cell = cells.find(x => x.cellId === e.gridCellId);
      lines.push(`### ${cell?.emoji || ''} ${cell?.name || e.gridCellId}${e.entryType === 'todo' ? ' [待办]' : ''}`);
      lines.push(e.plainPreview || '');
      if (e.planTime) lines.push(`计划时间: ${e.planTime}`);
      if (e.tags.length) lines.push(`标签: ${e.tags.map(t => `#${t}`).join(' ')}`);
      lines.push('');
    });
  });
  return lines.join('\n');
}
