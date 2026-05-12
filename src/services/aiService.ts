import type { GridCell, DayCanvas, Insight, InsightRange } from '@/types/models';
import { getDateKey } from '@/types/models';

// ========== Multi-Task Classification ==========

export interface ClassifiedItem {
  text: string;
  gridId: string;
  entryType: 'todo' | 'note';
  planTime: string | null;
  reason: string;
}

export async function classifyFlashMulti(
  text: string,
  cells: GridCell[],
  apiKey: string,
  baseUrl: string,
  model: string,
  correctionCases: { inputText: string; finalEntriesJson: string }[]
): Promise<ClassifiedItem[]> {
  const now = new Date();
  const prompt = buildClassifyPrompt(text, cells, now, correctionCases);

  const res = await fetch(`${baseUrl || 'https://api.deepseek.com'}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      temperature: 0.2, max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI 返回空内容');
  let parsed: any;
  try { parsed = JSON.parse(content); } catch { throw new Error('AI 返回格式错误'); }
  const rawItems = parsed.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('AI 未返回拆分结果');
  }
  const items: ClassifiedItem[] = rawItems.map((item: any) => ({
    text: item.text || text,
    gridId: item.gridId || cells[0].cellId,
    entryType: item.entryType === 'todo' ? 'todo' as const : 'note' as const,
    planTime: item.planTime || null,
    reason: item.reason || 'AI分析',
  }));
  return items;
}

function buildClassifyPrompt(text: string, cells: GridCell[], now: Date, cases: { inputText: string; finalEntriesJson: string }[]) {
  const cellList = cells.map(c => `${c.cellId}:${c.emoji}${c.name}`).join(' ');
  let system = `你是日记助手。时间:${now.toISOString()} 格子:${cellList}`;
  system += `\n规则:1.逗号/句号/顺路/顺便分隔的事件必须拆分 2.未来时间+计划语气→todo并填planTime为ISO 3.否则note`;
  system += `\n返回JSON:{"items":[{"text":"...","gridId":"gX","entryType":"todo|note","planTime":"ISO或null","reason":"..."}]}`;
  if (cases.length > 0) {
    system += `\n案例:`;
    cases.slice(0, 2).forEach((c, i) => { system += `${i + 1}.${c.inputText.slice(0,20)}→${c.finalEntriesJson.slice(0, 60)};`; });
  }
  return { system, user: `拆:"${text}"` };
}

// ========== Insight Generation ==========

export async function generateInsight(
  range: InsightRange, anchorDate: Date, allCanvases: DayCanvas[], cells: GridCell[],
  apiKey: string, baseUrl: string, model: string
): Promise<Insight> {
  const filtered = filterByRange(allCanvases, range, anchorDate);
  const total = filtered.reduce((s, c) => s + c.entries.length, 0);
  const gridBreakdown = cells.map(c => {
    const count = filtered.reduce((s, d) => s + d.entries.filter(e => e.gridCellId === c.cellId).length, 0);
    return { cellId: c.cellId, cellName: c.name, cellEmoji: c.emoji, count, topThemes: count > 0 ? ['记录'] : [] };
  }).filter(g => g.count > 0);

  // If no API key or no data, return local insight
  if (!apiKey || total === 0) {
    const labels: Record<InsightRange, string> = { day: '日', week: '周', month: '月', quarter: '季度', year: '年' };
    return {
      range, periodLabel: getPeriodLabel(range, anchorDate),
      summary: total > 0 ? `本${labels[range]}共记录 ${total} 条，涵盖 ${gridBreakdown.length} 个主题。` : `本${labels[range]}暂无记录。`,
      highlights: total > 0 ? ['保持记录习惯'] : [], emotionTrend: total > 0 ? '整体平稳' : '暂无数据',
      growthAreas: total > 0 ? ['持续记录'] : [], challenges: [],
      actionItems: total > 0 ? ['继续记录'] : ['开始记录吧'],
      gridBreakdown, generatedAt: new Date().toISOString(),
    };
  }

  // Call real AI API
  const prompt = buildInsightPrompt(range, anchorDate, filtered, cells, total);
  try {
    const res = await fetch(`${baseUrl || 'https://api.deepseek.com'}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        temperature: 0.5, max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response');
    const parsed = JSON.parse(content);

    return {
      range, periodLabel: getPeriodLabel(range, anchorDate),
      summary: parsed.summary || '暂无摘要',
      highlights: parsed.highlights || [],
      emotionTrend: parsed.emotionTrend || '整体平稳',
      growthAreas: parsed.growthAreas || [],
      challenges: parsed.challenges || [],
      actionItems: parsed.actionItems || [],
      gridBreakdown,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    const labels: Record<InsightRange, string> = { day: '日', week: '周', month: '月', quarter: '季度', year: '年' };
    return {
      range, periodLabel: getPeriodLabel(range, anchorDate),
      summary: `本${labels[range]}共记录 ${total} 条，涵盖 ${gridBreakdown.length} 个主题。`,
      highlights: ['保持记录习惯'], emotionTrend: '整体平稳',
      growthAreas: ['持续记录'], challenges: [],
      actionItems: ['继续记录'], gridBreakdown, generatedAt: new Date().toISOString(),
    };
  }
}

function buildInsightPrompt(
  range: InsightRange, anchorDate: Date, canvases: DayCanvas[], cells: GridCell[], totalEntries: number
) {
  const periodLabel = getPeriodLabel(range, anchorDate);
  let system = `你是个人日记分析助手。用户用九宫格日记法记录日常，请基于数据生成深度洞察。当前时间：${new Date().toISOString()}`;
  system += `\n\n返回严格JSON格式，字段：summary(摘要,50字内), highlights(亮点数组), emotionTrend(情绪趋势), growthAreas(成长领域数组), challenges(挑战数组), actionItems(行动建议数组)。不要输出其他内容。`;

  let user = `周期：${periodLabel}，共 ${totalEntries} 条记录。\n\n九宫格分布：\n`;
  cells.forEach(c => {
    const entries = canvases.flatMap(d => d.entries.filter(e => e.gridCellId === c.cellId));
    if (entries.length > 0) {
      user += `\n${c.emoji} ${c.name}(${entries.length}条)：\n`;
      entries.slice(0, 5).forEach(e => { user += `- ${e.plainPreview}\n`; });
    }
  });
  user += `\n请生成${periodLabel}的洞察分析。`;

  return { system, user };
}

function filterByRange(canvases: DayCanvas[], range: InsightRange, anchor: Date): DayCanvas[] {
  const key = getDateKey(anchor);
  switch (range) {
    case 'day': return canvases.filter(c => c.date === key);
    case 'week': { const ws = new Date(anchor); ws.setDate(anchor.getDate() - anchor.getDay()); const we = new Date(ws); we.setDate(ws.getDate() + 6); return canvases.filter(c => c.date >= getDateKey(ws) && c.date <= getDateKey(we)); }
    case 'month': return canvases.filter(c => c.date.startsWith(key.slice(0, 7)));
    case 'quarter': { const y = anchor.getFullYear(), m = anchor.getMonth(), qs = Math.floor(m / 3) * 3; return canvases.filter(c => { if (!c.date.startsWith(String(y))) return false; const cm = parseInt(c.date.slice(5, 7), 10) - 1; return cm >= qs && cm < qs + 3; }); }
    case 'year': return canvases.filter(c => c.date.startsWith(String(anchor.getFullYear())));
  }
}

function getPeriodLabel(range: InsightRange, d: Date): string {
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  switch (range) {
    case 'day': return `${y}年${m}月${day}日`;
    case 'week': { const ws = new Date(d); ws.setDate(d.getDate() - d.getDay()); const we = new Date(ws); we.setDate(ws.getDate() + 6); return `${y}年 ${ws.getMonth() + 1}/${ws.getDate()} - ${we.getMonth() + 1}/${we.getDate()}`; }
    case 'month': return `${y}年${m}月`; case 'quarter': return `${y}年第${Math.ceil(m / 3)}季度`; case 'year': return `${y}年`;
  }
}

// ========== Search ==========

export function naturalLanguageSearch(query: string, canvases: DayCanvas[]): { date: string; cellId: string; text: string; score: number }[] {
  const results: { date: string; cellId: string; text: string; score: number }[] = [];
  const keywords = query.split(/\s+/).filter(w => w.length >= 2);
  canvases.forEach(c => c.entries.forEach(e => {
    const text = e.plainPreview || '';
    let score = 0;
    keywords.forEach(k => { if (text.includes(k)) score++; });
    if (score > 0) results.push({ date: c.date, cellId: e.gridCellId, text: text.slice(0, 100), score });
  }));
  return results.sort((a, b) => b.score - a.score).slice(0, 20);
}
