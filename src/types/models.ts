// ========== 数据模型 v2.1 ==========
// 严格对齐 PRD v2.1 正式版

export interface GridCell {
  cellId: string;
  name: string;
  emoji: string;
  colorValue: string;
  description: string;
  keywords: string[];
  position: number;
  todoTemplates: string[];
}

export interface GridTemplate {
  id: string;
  name: string;
  cells: GridCell[];
  isDefault: boolean;
  createdAt: string;
}

export interface CanvasEntry {
  entryId: string;
  gridCellId: string;
  entryType: 'todo' | 'note';
  planTime: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contentDelta: string;
  plainPreview: string;
  tags: string[];
  source: 'template' | 'manual' | 'flash' | 'ai_distribute' | 'carry_over';
  mediaPaths: string[];
  isCarryOver: boolean;
  carriedFromDateKey: string | null;
  wasCorrected: boolean;
  aiReason: string | null;
}

export interface DayCanvas {
  id: string;
  date: string;
  templateName: string;
  gridSnapshotJson: string; // 当天格子定义快照
  entries: CanvasEntry[];
}

// FlashNote: 未归类闪记（用户输入后等待 AI 分发）
export interface FlashNote {
  id: string;
  date: string;
  text: string;
  aiSuggestedJson: string | null; // AI 建议的原始 JSON
  finalEntriesJson: string | null; // 用户确认后的条目列表
  userCorrected: boolean;
  createdAt: string;
}

export interface CorrectionCase {
  id: string;
  inputText: string;
  aiSuggestedJson: string;  // AI 原始建议 JSON
  finalEntriesJson: string; // 用户最终确认 JSON
  createdAt: string;
}

export interface InsightCache {
  id: string;
  granularity: 'day' | 'week' | 'month' | 'quarter' | 'year';
  periodStart: string;
  contentMarkdown: string;
  generatedAt: string;
}

export interface AppSettings {
  id: string;
  apiKey: string;
  customBaseUrl: string | null;
  aiModel: string;
  aiEnabled: boolean;
  monthlyAiBudget: number;
  currentMonthAiCost: number;
  themeMode: 0 | 1 | 2;
  fontFamily: string;
  fontSize: number;
  passwordHash: string | null;
  biometricEnabled: boolean;
  autoLockMinutes: number;
  autoCarryOver: boolean;
}

export type InsightRange = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface Insight {
  range: InsightRange;
  periodLabel: string;
  summary: string;
  highlights: string[];
  emotionTrend: string;
  growthAreas: string[];
  challenges: string[];
  actionItems: string[];
  gridBreakdown: {
    cellId: string;
    cellName: string;
    cellEmoji: string;
    count: number;
    topThemes: string[];
  }[];
  generatedAt: string;
}

export interface ExportData {
  version: string;
  exportDate: string;
  templates: GridTemplate[];
  dayCanvases: DayCanvas[];
  flashNotes: FlashNote[];
  correctionCases: CorrectionCase[];
  settings: Partial<AppSettings>;
}

export interface TagNode {
  name: string;
  fullPath: string;
  count: number;
  children: TagNode[];
}

// ========== Defaults ==========

export const DEFAULT_CELLS: GridCell[] = [
  { cellId: 'g1', name: '工作', emoji: '\ud83d\udcbc', colorValue: '#EF4444', description: '工作相关，项目进展、会议纪要、合作沟通', keywords: ['工作','项目','会议','客户','邮件','任务'], position: 0, todoTemplates: [] },
  { cellId: 'g2', name: '学习', emoji: '\ud83d\udcda', colorValue: '#F97316', description: '学习笔记、读书心得、课程学习、新技能掌握', keywords: ['学习','读书','课程','笔记','知识','技能'], position: 1, todoTemplates: [] },
  { cellId: 'g3', name: '健康', emoji: '\ud83c\udf3f', colorValue: '#22C55E', description: '运动健身、饮食睡眠、身体状态、健康习惯', keywords: ['运动','健身','跑步','饮食','睡眠','健康'], position: 2, todoTemplates: [] },
  { cellId: 'g4', name: '家庭', emoji: '\ud83c\udfe0', colorValue: '#3B82F6', description: '家人互动、亲子时光、家务琐事、家庭计划', keywords: ['家人','父母','孩子','家庭','家务','陪伴'], position: 3, todoTemplates: [] },
  { cellId: 'g5', name: '财务', emoji: '\ud83d\udcb0', colorValue: '#EAB308', description: '收入支出、理财规划、投资决策、储蓄进度', keywords: ['收入','支出','理财','投资','储蓄','预算'], position: 4, todoTemplates: [] },
  { cellId: 'g6', name: '社交', emoji: '\ud83d\udc65', colorValue: '#8B5CF6', description: '朋友聚会、社交活动、人脉维护', keywords: ['朋友','聚会','社交','聊天','人脉'], position: 5, todoTemplates: [] },
  { cellId: 'g7', name: '兴趣', emoji: '\ud83c\udfa8', colorValue: '#EC4899', description: '兴趣爱好、音乐绘画、旅行见闻、游戏娱乐', keywords: ['爱好','音乐','绘画','游戏','电影','旅行'], position: 6, todoTemplates: [] },
  { cellId: 'g8', name: '情绪', emoji: '\ud83e\uddd8', colorValue: '#14B8A6', description: '心情变化、情绪波动、压力感受、内心感悟', keywords: ['心情','情绪','压力','焦虑','感恩','快乐'], position: 7, todoTemplates: [] },
  { cellId: 'g9', name: '灵感', emoji: '\ud83d\udca1', colorValue: '#6366F1', description: '灵光一闪、创意构思、未来计划、目标梦想', keywords: ['想法','灵感','创意','计划','目标','梦想'], position: 8, todoTemplates: [] },
];

export const DEFAULT_TEMPLATE: GridTemplate = {
  id: 'default', name: '默认模板', cells: DEFAULT_CELLS, isDefault: true,
  createdAt: new Date().toISOString(),
};

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'settings', apiKey: '', customBaseUrl: null, aiModel: 'deepseek-v4-flash',
  aiEnabled: true, monthlyAiBudget: 50, currentMonthAiCost: 0, themeMode: 0,
  fontFamily: 'system', fontSize: 16, passwordHash: null,
  biometricEnabled: false, autoLockMinutes: 5, autoCarryOver: false,
};

// ========== Helpers ==========

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateCN(date: Date): string {
  const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${weekdays[date.getDay()]}`;
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

export function formatTimeShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
