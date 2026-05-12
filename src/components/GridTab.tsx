import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '@/context/AppContext';
import { getDateKey } from '@/types/models';
import type { ClassifiedItem } from '@/services/aiService';
import { AiClassifyModal } from './AiClassifyModal';
import { getDayCanvas } from '@/services/storage';

export function GridTab() {
  const { state, confirmFlashItems, getTodayTotalEntries } = useApp();
  const navigate = useNavigate();
  const dateKey = getDateKey(state.currentDate);
  const totalEntries = getTodayTotalEntries();
  const todayNotes = state.flashNotes.filter(n => n.date === dateKey && !n.finalEntriesJson);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalNote, setModalNote] = useState<typeof todayNotes[0] | null>(null);
  const [modalItems, setModalItems] = useState<ClassifiedItem[]>([]);

  return (
    <div className="grid-tab">
      <div className="grid-total-count">今天记录 <strong>{totalEntries}</strong> 条</div>

      {todayNotes.length > 0 && (
        <div className="flash-pending-section">
          <h3 className="flash-pending-title">待归类 ({todayNotes.length})</h3>
          {todayNotes.map(note => {
            const items: ClassifiedItem[] = note.aiSuggestedJson ? JSON.parse(note.aiSuggestedJson) : [];
            return (
              <div key={note.id} className="flash-pending-card">
                <div className="flash-pending-text">{note.text}</div>
                {items.length > 0 && (
                  <div className="flash-pending-ai">
                    <span className="flash-ai-badge">🤖</span>
                    <span>建议 {items.length} 条记录</span>
                  </div>
                )}
                <button className="flash-classify-btn" onClick={() => { setModalNote(note); setModalItems(items); setModalOpen(true); }}>查看并确认 →</button>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid-container">
        {state.currentTemplate.cells.map(cell => {
          const canvas = getDayCanvas(dateKey);
          const entries = canvas?.entries?.filter(e => e.gridCellId === cell.cellId) || [];
          const undoneTodos = entries.filter(e => e.entryType === 'todo' && !e.completedAt);
          const todoCount = undoneTodos.length;
          const displayEntries = todoCount > 0 ? undoneTodos : entries;
          return (
            <button key={cell.cellId} className="grid-cell-card" style={{ borderColor: cell.colorValue + '60' }} onClick={() => navigate(`/grid/${dateKey}/${cell.cellId}`)}>
              {todoCount > 0 && (
                <span className="grid-cell-badge" style={{ backgroundColor: cell.colorValue }}>
                  {todoCount}
                </span>
              )}
              <div className="grid-cell-header">
                <span className="grid-cell-emoji">{cell.emoji}</span>
                <span className="grid-cell-name">{cell.name}</span>
              </div>
              {entries.length === 0 ? (
                <div className="grid-cell-empty"> </div>
              ) : (
                <div className="grid-cell-items">
                  {displayEntries.slice(0, 3).map(entry => (
                    <div key={entry.entryId} className={`grid-cell-item ${entry.entryType === 'todo' && !entry.completedAt ? 'todo-undone' : ''} ${entry.completedAt ? 'done' : ''}`}>
                      <span className="grid-item-text">{entry.plainPreview.replace(/^- \[ \] /, '').replace(/^- \[x\] /, '').slice(0, 40)}</span>
                    </div>
                  ))}
                  {displayEntries.length > 3 && (
                    <div className="grid-cell-more">+{displayEntries.length - 3}</div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {modalOpen && modalNote && (
        <AiClassifyModal text={modalNote.text} items={modalItems} cells={state.currentTemplate.cells}
          onConfirm={(items) => { confirmFlashItems(modalNote.id, items); setModalOpen(false); }}
          onCancel={() => setModalOpen(false)} />
      )}
    </div>
  );
}
