import { X, Clock } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getDateKey } from '@/types/models';

interface Props { onClose: () => void; }

export function DailyBanner({ onClose }: Props) {
  const { state, getDayCanvas } = useApp();
  const date = state.currentDate;

  const offsets = [
    { label: '去年今日', days: -365 },
    { label: '半年前', days: -180 },
    { label: '三个月前', days: -90 },
  ];

  const memories = offsets.map(o => {
    const t = new Date(date);
    t.setDate(t.getDate() + o.days);
    const key = getDateKey(t);
    const canvas = getDayCanvas(key);
    return canvas && canvas.entries.length > 0 ? { label: o.label, canvas, entry: canvas.entries[0] } : null;
  }).filter(Boolean);

  if (memories.length === 0) return null;
  const m = memories[0]!;
  const cell = state.currentTemplate.cells.find(c => c.cellId === m.entry.gridCellId);

  return (
    <div className="daily-banner">
      <div className="daily-banner-content">
        <div className="daily-banner-icon"><Clock size={16} /></div>
        <div className="daily-banner-text">
          <div className="daily-banner-title">{m.label}：你在「{cell?.name || '...'}」中记录了</div>
          <div className="daily-banner-preview">{m.entry.plainPreview?.slice(0, 50) || ''}...</div>
        </div>
        <button className="daily-banner-close" onClick={onClose}><X size={16} /></button>
      </div>
    </div>
  );
}
