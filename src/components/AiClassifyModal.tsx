import { useState } from 'react';
import { X, Brain, Check, Shuffle, Trash2, FileText, ListTodo, Clock } from 'lucide-react';
import type { GridCell } from '@/types/models';
import type { ClassifiedItem } from '@/services/aiService';

interface Props {
  text: string;
  items: ClassifiedItem[];
  cells: GridCell[];
  onConfirm: (items: ClassifiedItem[]) => void;
  onCancel: () => void;
}

export function AiClassifyModal({ text, items: initialItems, cells, onConfirm, onCancel }: Props) {
  const [mode, setMode] = useState<'list' | 'manual'>('list');
  const [editedItems, setEditedItems] = useState<ClassifiedItem[]>(initialItems.length > 0 ? initialItems : [{ text, gridId: cells[0].cellId, entryType: 'note', planTime: null, reason: '手动' }]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const updateItem = (idx: number, patch: Partial<ClassifiedItem>) => {
    setEditedItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
  };

  const removeItem = (idx: number) => {
    setEditedItems(prev => prev.filter((_, i) => i !== idx));
    if (selectedIdx >= editedItems.length - 1) setSelectedIdx(Math.max(0, editedItems.length - 2));
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><Brain size={18} /><span>AI 分发确认</span></div>
          <button className="modal-close" onClick={onCancel}><X size={18} /></button>
        </div>

        <div className="modal-flash-text"><span className="modal-label">你的闪记</span><p>{text}</p></div>

        {mode === 'list' ? (
          <>
            <div className="modal-label">AI 建议 ({editedItems.length} 条)</div>
            <div className="multi-item-list">
              {editedItems.map((item, idx) => {
                const cell = cells.find(c => c.cellId === item.gridId);
                return (
                  <div key={idx} className={`multi-item-card ${selectedIdx === idx ? 'selected' : ''}`} onClick={() => setSelectedIdx(idx)}>
                    <div className="multi-item-header">
                      <span className="multi-item-num">{idx + 1}</span>
                      <span className="multi-item-cell" style={{ color: cell?.colorValue }}>{cell?.emoji} {cell?.name}</span>
                      <button className={`type-toggle-mini ${item.entryType}`} onClick={(e) => { e.stopPropagation(); updateItem(idx, { entryType: item.entryType === 'todo' ? 'note' : 'todo' }); }}>
                        {item.entryType === 'todo' ? <><ListTodo size={12} />待办</> : <><FileText size={12} />记录</>}
                      </button>
                      <button className="multi-item-remove" onClick={(e) => { e.stopPropagation(); removeItem(idx); }}><X size={14} /></button>
                    </div>
                    <div className="multi-item-text">{item.text}</div>
                    <div className="multi-item-footer">
                      <span className="multi-item-reason">{item.reason}</span>
                      {item.planTime && <span className="multi-item-time"><Clock size={10} />{new Date(item.planTime).toLocaleString('zh-CN')}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedIdx >= 0 && editedItems[selectedIdx] && (
              <div className="modal-section">
                <span className="modal-label">修改「{editedItems[selectedIdx].text.slice(0, 10)}...」</span>
                <div className="edit-row">
                  <select value={editedItems[selectedIdx].gridId} onChange={e => updateItem(selectedIdx, { gridId: e.target.value })} className="edit-select">
                    {cells.map(c => <option key={c.cellId} value={c.cellId}>{c.emoji} {c.name}</option>)}
                  </select>
                  <button className={`type-toggle-mini ${editedItems[selectedIdx].entryType}`} onClick={() => updateItem(selectedIdx, { entryType: editedItems[selectedIdx].entryType === 'todo' ? 'note' : 'todo' })}>
                    {editedItems[selectedIdx].entryType === 'todo' ? '切换为记录' : '切换为待办'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="modal-section">
            <span className="modal-label">选择格子</span>
            <div className="manual-grid">
              {cells.map(cell => (
                <button key={cell.cellId} className={`manual-cell-btn ${editedItems[0]?.gridId === cell.cellId ? 'active' : ''}`} style={{ backgroundColor: cell.colorValue + '15', borderColor: editedItems[0]?.gridId === cell.cellId ? cell.colorValue : cell.colorValue + '30' }} onClick={() => { setEditedItems([{ ...editedItems[0], gridId: cell.cellId }]); setMode('list'); }}>
                  <span className="manual-emoji">{cell.emoji}</span><span className="manual-name">{cell.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="modal-btn primary" onClick={() => onConfirm(editedItems)}><Check size={16} />确认归入 ({editedItems.length} 条)</button>
          <button className="modal-btn secondary" onClick={() => setMode('manual')}><Shuffle size={16} />手动选格</button>
          <button className="modal-btn ghost" onClick={onCancel}><Trash2 size={16} />取消</button>
        </div>
      </div>
    </div>
  );
}
