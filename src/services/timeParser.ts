// ========== 时间语义解析 ==========
// 从用户输入中提取时间表达，判断是待办还是记录

export interface ParsedTime {
  original: string;     // 原文
  hour: number;         // 24小时制小时
  minute: number;       // 分钟
  timeStr: string;      // 格式化 "10:00"
  isToday: boolean;     // 是否为今天
  dateOffset: number;   // 日期偏移（0=今天, 1=明天, -1=昨天）
}

// 解析用户输入中的时间表达
export function parseTimeMention(text: string, _now?: Date): ParsedTime | null {
  const patterns: { regex: RegExp; handler: (m: RegExpMatchArray) => Omit<ParsedTime, 'original'> | null }[] = [
    // "上午10点" / "上午10:30"
    {
      regex: /(?:今天|明天)?\s*上午\s*(\d{1,2})\s*[点:]?\s*(\d{1,2})?\s*分?/,
      handler: (m) => ({
        hour: parseInt(m[1], 10),
        minute: m[2] ? parseInt(m[2], 10) : 0,
        timeStr: `${m[1].padStart(2, '0')}:${(m[2] || '0').padStart(2, '0')}`,
        isToday: !m[0].includes('明天'),
        dateOffset: m[0].includes('明天') ? 1 : 0,
      }),
    },
    // "下午3点" / "下午3:30" — 12小时制转24小时
    {
      regex: /(?:今天|明天)?\s*下午\s*(\d{1,2})\s*[点:]?\s*(\d{1,2})?\s*分?/,
      handler: (m) => {
        let h = parseInt(m[1], 10);
        if (h < 12) h += 12;
        return {
          hour: h,
          minute: m[2] ? parseInt(m[2], 10) : 0,
          timeStr: `${String(h).padStart(2, '0')}:${(m[2] || '0').padStart(2, '0')}`,
          isToday: !m[0].includes('明天'),
          dateOffset: m[0].includes('明天') ? 1 : 0,
        };
      },
    },
    // "晚上8点"
    {
      regex: /(?:今天|明天)?\s*晚上\s*(\d{1,2})\s*[点:]?\s*(\d{1,2})?\s*分?/,
      handler: (m) => {
        let h = parseInt(m[1], 10);
        if (h < 12) h += 12;
        return {
          hour: h,
          minute: m[2] ? parseInt(m[2], 10) : 0,
          timeStr: `${String(h).padStart(2, '0')}:${(m[2] || '0').padStart(2, '0')}`,
          isToday: !m[0].includes('明天'),
          dateOffset: m[0].includes('明天') ? 1 : 0,
        };
      },
    },
    // "10点" / "10:30" / "10点半"
    {
      regex: /(?:今天|明天)?\s*(\d{1,2})\s*[点:]\s*(\d{1,2}|半)?/,
      handler: (m) => {
        let h = parseInt(m[1], 10);
        const minStr = m[2];
        let minute = 0;
        if (minStr === '半') minute = 30;
        else if (minStr) minute = parseInt(minStr, 10);
        // 如果只说数字小于7点，默认是下午（如"3点开会"更可能是下午）
        if (h <= 7 && !minStr) h += 12;
        return {
          hour: h,
          minute,
          timeStr: `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
          isToday: !m[0].includes('明天'),
          dateOffset: m[0].includes('明天') ? 1 : 0,
        };
      },
    },
    // "明天早上/上午/下午/晚上"
    {
      regex: /明天(?:早上|上午|下午|晚上)?\s*(\d{1,2})?\s*[点:]?\s*(\d{1,2})?/,
      handler: (m) => {
        let h = m[1] ? parseInt(m[1], 10) : 9; // 默认9点
        if (m[0].includes('下午') || m[0].includes('晚上')) {
          if (h < 12) h += 12;
        }
        return {
          hour: h,
          minute: m[2] ? parseInt(m[2], 10) : 0,
          timeStr: `${String(h).padStart(2, '0')}:${(m[2] || '0').padStart(2, '0')}`,
          isToday: false,
          dateOffset: 1,
        };
      },
    },
  ];

  for (const { regex, handler } of patterns) {
    const match = text.match(regex);
    if (match) {
      const result = handler(match);
      if (result) {
        return { ...result, original: match[0] };
      }
    }
  }

  return null;
}

// 判断一条记录的时间类型
// 如果在提到的时间之前记录 → 待办 (todo)
// 如果在提到的时间之后记录 → 已完成记录 (record)
export function determineTimeType(
  text: string,
  recordTime: Date
): { timeType: 'record' | 'todo'; mentionedTime: ParsedTime | null } {
  const mentioned = parseTimeMention(text, recordTime);
  if (!mentioned) {
    return { timeType: 'record', mentionedTime: null };
  }

  // 构建用户提到的时间点
  const mentionedDate = new Date(recordTime);
  mentionedDate.setDate(mentionedDate.getDate() + mentioned.dateOffset);
  mentionedDate.setHours(mentioned.hour, mentioned.minute, 0, 0);

  // 如果记录时间早于提到的时间 → 这是待办
  if (recordTime.getTime() < mentionedDate.getTime()) {
    return { timeType: 'todo', mentionedTime: mentioned };
  }

  // 记录时间晚于或等于提到的时间 → 这是记录
  return { timeType: 'record', mentionedTime: mentioned };
}

// 格式化显示时间
export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// 格式化日期时间
export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${h}:${m}`;
}

// 获取相对时间描述
export function getRelativeTimeDesc(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}天前`;
  return formatDateTime(dateStr);
}

// 提取待办事项描述（去掉时间部分）
export function extractTodoTitle(text: string): string {
  // 去掉常见的时间前缀
  return text
    .replace(/今天|明天/, '')
    .replace(/上午|下午|晚上/, '')
    .replace(/\d{1,2}\s*[点:]\s*\d{0,2}\s*分?/, '')
    .replace(/^[\s，,]+/, '')
    .trim();
}
