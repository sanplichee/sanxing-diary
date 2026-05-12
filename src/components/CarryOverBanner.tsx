import { useState, useMemo } from 'react';
import { RotateCcw, Check, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getDateKey } from '@/types/models';

export function CarryOverBanner() {
  const { state, carryOverTodos } = useApp();
  const [dismissed, setDismissed] = useState(false);
  const todayKey = getDateKey(state.currentDate);

  const yesterdayKey = useMemo(() => {
    const d = new Date(state.currentDate);
    d.setDate(d.getDate() - 1);
    return getDateKey(d);
  }, [state.currentDate]);

  const undone = useMemo(() => {
    const yesterdayCanvas = JSON.parse(localStorage.getItem('sx_dayCanvases') || '[]').find((c: { date: string }) => c.date === yesterdayKey);
    return yesterdayCanvas?.entries?.filter((e: { entryType: string; completedAt: unknown }) => e.entryType === 'todo' && !e.completedAt) || [];
  }, [yesterdayKey]);

  if (dismissed || undone.length === 0) return null;
  if (state.settings.autoCarryOver) {
    carryOverTodos(yesterdayKey, todayKey);
    return null;
  }

  return (
    <div className="carryover-banner">
      <div className="carryover-content">
        <RotateCcw size={16} />
        <span>昨日有 <strong>{undone.length}</strong> 个待办未完成</span>
        <button className="carryover-btn" onClick={() => { carryOverTodos(yesterdayKey, todayKey); setDismissed(true); }}><Check size={14} />结转到今天</button>
        <button className="carryover-dismiss" onClick={() => setDismissed(true)}><X size={14} /></button>
      </div>
    </div>
  );
}
