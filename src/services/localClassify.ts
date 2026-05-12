import type { GridCell } from '@/types/models';
import type { ClassifiedItem } from './aiService';

/**
 * 本地智能分类引擎 — 无AI时的离线降级
 * 
 * 功能：
 * 1. 多任务拆分（基于标点、连接词）
 * 2. 关键词匹配格子
 * 3. 时间语义提取
 * 4. 待办/记录自动判断
 */

// 拆分连接词
const SPLIT_PATTERNS = /[,，;；。！!]+|然后|之后|接着|后来|顺便|顺路|还有|以及|和(?=\s*[^，])/;

// 待办关键词（表示意图/计划）
const TODO_KEYWORDS = ['要', '需要', '记得', '计划', '准备', '打算', '必须', '得去', '别忘了', '赶紧', '抽空', '找机会', '待会', '等一下', '回头', '明天', '后天', '下周', '下个月'];

// 记录关键词（表示已完成/事实）
const NOTE_KEYWORDS = ['已经', '完成了', '做了', '去了', '看了', '买了', '吃了', '写了', '读完了', '跑完了', '练了'];

// 时间正则
const TIME_PATTERNS = [
  { regex: /(上午|早上|早晨|早)\s*(\d{1,2})\s*[点:：]\s*(\d{0,2})/, type: 'am' as const },
  { regex: /(下午|傍晚|晚上|晚)\s*(\d{1,2})\s*[点:：]\s*(\d{0,2})/, type: 'pm' as const },
  { regex: /(\d{1,2})\s*[点:：]\s*(\d{0,2})\s*(上午|下午|晚上)?/, type: 'hour' as const },
  { regex: /(\d{1,2}):\s*(\d{2})\s*(am|pm|AM|PM|上午|下午)?/, type: 'colon' as const },
];

/**
 * 主入口：本地智能分类
 */
export function localClassify(text: string, cells: GridCell[], now: Date = new Date()): ClassifiedItem[] {
  // Step 1: 拆分为多个子任务
  const segments = splitText(text);
  if (segments.length === 0) segments.push(text);

  const items: ClassifiedItem[] = [];

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;

    // Step 2: 匹配格子
    const gridId = matchCell(trimmed, cells);

    // Step 3: 提取时间
    const planTime = extractTime(trimmed, now);

    // Step 4: 判断待办/记录
    const entryType = judgeType(trimmed, planTime, now);

    items.push({
      text: trimmed,
      gridId,
      entryType,
      planTime,
      reason: getReason(gridId, cells, entryType, planTime),
    });
  }

  return items.length > 0 ? items : [{
    text, gridId: cells[0]?.cellId || 'g1',
    entryType: 'note', planTime: null,
    reason: '默认归类',
  }];
}

/**
 * Step 1: 多任务拆分
 */
function splitText(text: string): string[] {
  // 先按强分隔符拆分
  const parts = text.split(SPLIT_PATTERNS).map(s => s.trim()).filter(Boolean);
  
  // 如果拆分后只有一条且包含"和"，尝试按"和"拆分
  if (parts.length === 1) {
    const andMatch = text.match(/^(.+?)\s*和\s*(.+?)$/);
    if (andMatch) {
      return [andMatch[1], andMatch[2]];
    }
  }

  return parts;
}

/**
 * Step 2: 关键词匹配格子
 */
function matchCell(text: string, cells: GridCell[]): string {
  let bestCell = cells[0];
  let bestScore = 0;

  for (const cell of cells) {
    let score = 0;

    // 关键词匹配（权重最高）
    for (const kw of cell.keywords) {
      if (text.includes(kw)) {
        score += kw.length >= 4 ? 5 : 3;
      }
    }

    // 描述匹配
    if (cell.description) {
      const descWords = cell.description.split(/[,，、\s]+/).filter(w => w.length >= 2);
      for (const word of descWords) {
        if (text.includes(word)) score += 1;
      }
    }

    // 名称匹配
    if (text.includes(cell.name)) score += 4;

    // emoji 名称匹配（去掉emoji字符）
    if (cell.emoji && text.includes(cell.name)) score += 2;

    if (score > bestScore) {
      bestScore = score;
      bestCell = cell;
    }
  }

  return bestCell?.cellId || cells[0]?.cellId || 'g1';
}

/**
 * Step 3: 时间语义提取
 */
function extractTime(text: string, now: Date): string | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const pattern of TIME_PATTERNS) {
    const match = text.match(pattern.regex);
    if (!match) continue;

    let hour = 0;
    let minute = 0;

    if (pattern.type === 'am') {
      hour = parseInt(match[2], 10);
      minute = parseInt(match[3] || '0', 10);
      if (hour === 12) hour = 0; // 上午12点 = 0点
    } else if (pattern.type === 'pm') {
      hour = parseInt(match[2], 10);
      minute = parseInt(match[3] || '0', 10);
      if (hour !== 12) hour += 12; // 下午1点 = 13点
    } else if (pattern.type === 'hour') {
      hour = parseInt(match[1], 10);
      minute = parseInt(match[2] || '0', 10);
      const ampm = match[3];
      if (ampm?.includes('下午') || ampm?.includes('晚上')) {
        if (hour !== 12) hour += 12;
      }
    } else if (pattern.type === 'colon') {
      hour = parseInt(match[1], 10);
      minute = parseInt(match[2], 10);
      const ampm = match[3];
      if (ampm?.toLowerCase() === 'pm') {
        if (hour !== 12) hour += 12;
      }
    }

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      const result = new Date(today);
      result.setHours(hour, minute, 0, 0);
      return result.toISOString();
    }
  }

  // 相对时间："一小时后"、"两小时后"
  const relativeMatch = text.match(/(\d+)\s*个?\s*(小时|钟头)\s*后/);
  if (relativeMatch) {
    const hours = parseInt(relativeMatch[1], 10);
    const result = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return result.toISOString();
  }

  return null;
}

/**
 * Step 4: 待办/记录判断
 */
function judgeType(text: string, planTime: string | null, now: Date): 'todo' | 'note' {
  // 如果有未来时间，大概率是待办
  if (planTime) {
    const planDate = new Date(planTime);
    const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000);
    if (planDate > fiveMinLater) return 'todo';
  }

  // 检查待办关键词
  for (const kw of TODO_KEYWORDS) {
    if (text.includes(kw)) return 'todo';
  }

  // 检查记录关键词（已完成的事实）
  for (const kw of NOTE_KEYWORDS) {
    if (text.includes(kw)) return 'note';
  }

  // 默认：有待办关键词倾向 → 待办，否则 → 记录
  return 'note';
}

function getReason(gridId: string, cells: GridCell[], entryType: 'todo' | 'note', planTime: string | null): string {
  const cell = cells.find(c => c.cellId === gridId);
  const parts: string[] = [];
  if (cell) parts.push(`匹配「${cell.name}」`);
  parts.push(entryType === 'todo' ? '待办' : '记录');
  if (planTime) parts.push('含时间');
  return parts.join(' · ');
}
