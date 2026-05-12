import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Flame, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getDateKey } from '@/types/models';
import { loadDayCanvases } from '@/services/storage';
import type { DayCanvas, CanvasEntry } from '@/types/models';

type ViewMode = 'week' | 'heatmap';

// Get today's date at midnight
const getToday = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export function CalendarPage() {
  const { state } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(getToday());
  const [selectedDate, setSelectedDate] = useState<Date | null>(getToday());

  const allCanvases = useMemo(() => loadDayCanvases(), []);

  const getCanvas = (dateKey: string): DayCanvas | undefined => {
    return allCanvases.find(c => c.date === dateKey);
  };

  const getEntryCount = (dateKey: string): number => {
    const canvas = getCanvas(dateKey);
    return canvas?.entries.length || 0;
  };

  // Week view: calculate week start (Sunday)
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday
    const start = new Date(d.getFullYear(), d.getMonth(), diff);

    const days: { date: Date; key: string; entries: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = getDateKey(date);
      days.push({ date, key, entries: getEntryCount(key) });
    }
    return days;
  }, [currentDate]);

  // Month heatmap data
  const heatmapMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: { date: Date; key: string; count: number }[] = [];

    // Padding from prev month
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      const key = getDateKey(d);
      days.push({ date: d, key, count: getEntryCount(key) });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const key = getDateKey(d);
      days.push({ date: d, key, count: getEntryCount(key) });
    }
    // Padding for next month
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const key = getDateKey(d);
      days.push({ date: d, key, count: getEntryCount(key) });
    }
    return days;
  }, [currentDate]);

  const prevWeek = () => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7)); };
  const nextWeek = () => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7)); };
  const prevMonth = () => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)); };
  const nextMonth = () => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)); };

  const getHeatColor = (count: number): string => {
    if (count === 0) return 'var(--heat-0)';
    if (count <= 2) return 'var(--heat-1)';
    if (count <= 5) return 'var(--heat-2)';
    if (count <= 8) return 'var(--heat-3)';
    return 'var(--heat-4)';
  };

  const weekDayLabels = ['日', '一', '二', '三', '四', '五', '六'];
  const todayKey = getDateKey(new Date());

  const selectedCanvas = selectedDate ? getCanvas(getDateKey(selectedDate)) : undefined;

  return (
    <div className="calendar-page">
      {/* View Toggle */}
      <div className="calendar-view-toggle">
        <button className={viewMode === 'week' ? 'active' : ''} onClick={() => setViewMode('week')}>
          <CalendarDays size={14} />周视图
        </button>
        <button className={viewMode === 'heatmap' ? 'active' : ''} onClick={() => setViewMode('heatmap')}>
          <Flame size={14} />月度热力图
        </button>
      </div>

      {viewMode === 'week' ? (
        <>
          {/* Week Navigation */}
          <div className="calendar-nav">
            <button onClick={prevWeek}><ChevronLeft size={18} /></button>
            <span>{weekDays[0].date.getFullYear()}年{weekDays[0].date.getMonth() + 1}月{weekDays[0].date.getDate()}日 - {weekDays[6].date.getMonth() + 1}月{weekDays[6].date.getDate()}日</span>
            <button onClick={nextWeek}><ChevronRight size={18} /></button>
          </div>

          {/* Week Grid */}
          <div className="week-grid">
            {weekDays.map((day, idx) => {
              const isToday = day.key === todayKey;
              const isSelected = selectedDate && getDateKey(selectedDate) === day.key;
              const cell = state.currentTemplate.cells[0];
              return (
                <button
                  key={idx}
                  className={`week-day-card ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${day.entries > 0 ? 'has-entries' : ''}`}
                  onClick={() => setSelectedDate(day.date)}
                >
                  <div className="week-day-label">{weekDayLabels[idx]}</div>
                  <div className="week-day-number">{day.date.getDate()}</div>
                  <div className="week-day-bar" style={{ backgroundColor: day.entries > 0 ? (cell?.colorValue || '#6366F1') : 'transparent', opacity: day.entries > 0 ? 0.6 : 0 }} />
                  {day.entries > 0 && <span className="week-day-count">{day.entries}</span>}
                </button>
              );
            })}
          </div>

          {/* Selected Day Timeline */}
          {selectedDate && selectedCanvas && selectedCanvas.entries.length > 0 && (
            <div className="day-timeline">
              <div className="timeline-header">
                <span>{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 记录</span>
                <button className="timeline-close" onClick={() => setSelectedDate(null)}><X size={14} /></button>
              </div>
              {renderTimeline(selectedCanvas.entries, state.currentTemplate.cells)}
            </div>
          )}

          {selectedDate && (!selectedCanvas || selectedCanvas.entries.length === 0) && (
            <div className="day-timeline">
              <div className="timeline-header">
                <span>{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 记录</span>
                <button className="timeline-close" onClick={() => setSelectedDate(null)}><X size={14} /></button>
              </div>
              <div className="timeline-empty">该日暂无记录</div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Month Navigation */}
          <div className="calendar-nav">
            <button onClick={prevMonth}><ChevronLeft size={18} /></button>
            <span>{currentDate.getFullYear()}年{currentDate.getMonth() + 1}月</span>
            <button onClick={nextMonth}><ChevronRight size={18} /></button>
          </div>

          {/* Heatmap Grid */}
          <div className="heatmap-month-grid">
            {weekDayLabels.map(d => <div key={d} className="heatmap-weekday-label">{d}</div>)}
            {heatmapMonth.map((day, idx) => {
              const isToday = day.key === todayKey;
              const isCurrentMonth = day.date.getMonth() === currentDate.getMonth();
              return (
                <div
                  key={idx}
                  className={`heatmap-month-day ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
                  style={{ backgroundColor: isCurrentMonth ? getHeatColor(day.count) : 'transparent' }}
                  title={`${day.key}: ${day.count} 条`}
                  onClick={() => { if (isCurrentMonth) setSelectedDate(day.date); }}
                >
                  {isCurrentMonth && <span className="heatmap-day-num">{day.date.getDate()}</span>}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="heatmap-legend">
            <span>少</span>
            {[0, 1, 3, 5, 8].map(n => <div key={n} className="legend-box" style={{ backgroundColor: getHeatColor(n) }} />)}
            <span>多</span>
          </div>

          {/* Selected Day Timeline */}
          {selectedDate && selectedCanvas && selectedCanvas.entries.length > 0 && (
            <div className="day-timeline">
              <div className="timeline-header">
                <span>{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 记录</span>
                <button className="timeline-close" onClick={() => setSelectedDate(null)}><X size={14} /></button>
              </div>
              {renderTimeline(selectedCanvas.entries, state.currentTemplate.cells)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function cleanText(text: string): string {
  return text.replace(/^- \[ \] /, '').replace(/^- \[x\] /, '').replace(/^☐ /, '').replace(/^✓ /, '').replace(/^\[ \] /, '');
}

function renderTimeline(entries: CanvasEntry[], cells: { cellId: string; emoji: string; name: string; colorValue: string }[]) {
  const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="timeline-list">
      {sorted.map((entry) => {
        const cell = cells.find(c => c.cellId === entry.gridCellId);
        const time = new Date(entry.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const isUndoneTodo = entry.entryType === 'todo' && !entry.completedAt;
        const isDoneTodo = entry.entryType === 'todo' && entry.completedAt;
        return (
          <div key={entry.entryId} className={`timeline-item ${isUndoneTodo ? 'todo' : ''} ${isDoneTodo ? 'done' : ''}`}>
            <div className="timeline-left">
              <span className="timeline-time">{time}</span>
              <div className="timeline-line" />
            </div>
            <div className="timeline-body">
              <div className="timeline-cell-tag" style={{ color: cell?.colorValue }}>{cell?.emoji} {cell?.name}</div>
              <div className="timeline-text">{cleanText(entry.plainPreview)}</div>
              {entry.planTime && isUndoneTodo && (
                <span className="timeline-plan-badge">计划 {formatTimeShort(entry.planTime)}</span>
              )}
            </div>
            {isUndoneTodo && <div className="timeline-todo-dot undone" />}
            {isDoneTodo && <div className="timeline-todo-dot done" />}
          </div>
        );
      })}
    </div>
  );
}

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
