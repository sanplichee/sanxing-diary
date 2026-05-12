import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getDateKey } from '@/types/models';

export function DateNavigator() {
  const { state, prevDay, nextDay } = useApp();
  const isToday = getDateKey(state.currentDate) === getDateKey(new Date());

  return (
    <div className="date-navigator">
      <button className="date-nav-btn" onClick={prevDay}>
        <ChevronLeft size={18} />
      </button>
      <div className={`date-nav-center ${!isToday ? 'not-today' : ''}`}>
        <CalendarIcon size={14} />
        <span>{isToday ? '今天' : state.currentDate.toLocaleDateString('zh-CN')}</span>
      </div>
      <button className="date-nav-btn" onClick={nextDay}>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
