import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getDateKey } from '@/types/models';
import type { ClassifiedItem } from '@/services/aiService';
import { AiClassifyModal } from './AiClassifyModal';

export function FlashTab() {
  const { state, confirmFlashItems, deleteFlashNote } = useApp();
  const todayKey = getDateKey(state.currentDate);
  const todayNotes = state.flashNotes.filter(n => n.date === todayKey && !n.finalEntriesJson);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalNote, setModalNote] = useState<typeof todayNotes[0] | null>(null);
  const [modalItems, setModalItems] = useState<ClassifiedItem[]>([]);

  if (todayNotes.length === 0) return null;

  return (
    <div className="flash-tab">
      <h3 className="flash-notes-title">待归类 ({todayNotes.length})</h3>
      {todayNotes.map(note => {
        const items: ClassifiedItem[] = note.aiSuggestedJson ? JSON.parse(note.aiSuggestedJson) : [];
        return (
          <div key={note.id} className="flash-note-card">
            <div className="flash-note-text">{note.text}</div>
            {items.length > 0 && (
              <div className="flash-pending-ai">
                <span className="flash-ai-badge">🤖</span>
                <span>AI 建议 {items.length} 条记录</span>
              </div>
            )}
            <div className="flash-note-actions">
              <button className="flash-classify-btn" onClick={() => { setModalNote(note); setModalItems(items); setModalOpen(true); }}>查看并确认 →</button>
              <button className="entry-delete-btn-small" style={{ opacity: 1 }} onClick={() => { if (confirm('确定删除？')) deleteFlashNote(note.id); }}><Trash2 size={14} /></button>
            </div>
          </div>
        );
      })}
      {modalOpen && modalNote && (
        <AiClassifyModal text={modalNote.text} items={modalItems} cells={state.currentTemplate.cells}
          onConfirm={(items) => { confirmFlashItems(modalNote.id, items); setModalOpen(false); }}
          onCancel={() => setModalOpen(false)} />
      )}
    </div>
  );
}
