import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, FileText, ListTodo, CheckCircle2, Circle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { generateId, formatTime, formatTimeShort } from '@/types/models';
import type { CanvasEntry, GridCell } from '@/types/models';
import { EntryContextMenu } from '@/components/EntryContextMenu';
import { RichEditor } from '@/components/RichEditor';

export function GridDetailPage() {
  const { date, cellId } = useParams<{ date: string; cellId: string }>();
  const navigate = useNavigate();
  const { state, getDayCanvas, saveCanvasEntry, deleteCanvasEntry, moveEntry, updateEntryType, completeTodo, uncompleteTodo, showToast } = useApp();

  // Resolve cell: use snapshot if available, else current template
  const canvas = date ? getDayCanvas(date) : undefined;
  let cell: GridCell | undefined;
  if (canvas?.gridSnapshotJson) {
    try { const snapshot: GridCell[] = JSON.parse(canvas.gridSnapshotJson); cell = snapshot.find(c => c.cellId === cellId); } catch {}
  }
  if (!cell) cell = state.currentTemplate.cells.find(c => c.cellId === cellId);

  const [entries, setEntries] = useState<CanvasEntry[]>([]);

  useEffect(() => { if (!date || !cellId) return; const c = getDayCanvas(date); const list = c?.entries.filter(e => e.gridCellId === cellId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) || []; setEntries(list); }, [date, cellId, getDayCanvas]);

  const handleSend = useCallback((text: string, images: string[]) => {
    if (!text.trim() || !date || !cellId) return;
    const entry: CanvasEntry = {
      entryId: generateId(), gridCellId: cellId, entryType: 'note', planTime: null, completedAt: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      contentDelta: `<p>${text.replace(/\n/g, '<br/>')}</p>`,
      plainPreview: text.slice(0, 200), tags: [], source: 'manual',
      mediaPaths: images, isCarryOver: false, carriedFromDateKey: null,
      wasCorrected: false, aiReason: null,
    };
    saveCanvasEntry(date, entry); setEntries(prev => [...prev, entry]);
  }, [date, cellId, saveCanvasEntry]);

  const handleDelete = useCallback((eid: string) => { if (!date) return; if (confirm('确定删除？')) { deleteCanvasEntry(date, eid); setEntries(prev => prev.filter(e => e.entryId !== eid)); } }, [date, deleteCanvasEntry]);
  const handleMove = useCallback((eid: string, ncid: string) => { if (!date) return; moveEntry(date, eid, ncid); setEntries(prev => prev.filter(e => e.entryId !== eid)); }, [date, moveEntry]);
  const handleChangeType = useCallback((eid: string, nt: 'todo' | 'note') => { if (!date) return; updateEntryType(date, eid, nt); setEntries(prev => prev.map(e => e.entryId === eid ? { ...e, entryType: nt } : e)); }, [date, updateEntryType]);

  if (!cell) return <div className="grid-detail-page"><div className="detail-header"><button onClick={() => navigate('/')}><ArrowLeft size={20} /></button><span>格子不存在</span></div></div>;

  const todos = entries.filter(e => e.entryType === 'todo' && !e.completedAt);
  const doneTodos = entries.filter(e => e.completedAt);
  const notes = entries.filter(e => e.entryType === 'note');

  return (
    <div className="grid-detail-page">
      <div className="detail-header" style={{ backgroundColor: cell.colorValue + '15' }}>
        <button className="detail-back" onClick={() => navigate('/')}><ArrowLeft size={20} /></button>
        <div className="detail-title"><span className="detail-emoji">{cell.emoji}</span><span>{cell.name}</span></div>
        <div style={{ width: 40 }} />
      </div>
      {cell.description && <div className="cell-description-bar"><span className="cell-desc-label">{cell.name}</span><span className="cell-desc-text">{cell.description}</span></div>}

      <div className="entries-timeline">
        <div className="timeline-header"><FileText size={14} /><span>时间轴</span><span className="timeline-count">{entries.length} 条</span></div>

        {todos.length > 0 && <div className="timeline-section"><div className="timeline-section-title"><ListTodo size={14} />待办 ({todos.length})</div>
          {todos.map(entry => (
            <div key={entry.entryId} className="entry-timeline-item todo-item">
              <div className="entry-timeline-dot todo" />
              <div className="entry-timeline-content">
                <div className="entry-timeline-time-row">
                  <span className="timeline-time">{formatTime(entry.createdAt)}</span>
                  {entry.planTime && <span className="timeline-plan-time">计划 {formatTimeShort(entry.planTime)}</span>}
                  {entry.isCarryOver && <span className="carry-badge">&#x21BB; 结转</span>}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                    <EntryContextMenu entry={entry} cells={state.currentTemplate.cells} onChangeType={handleChangeType} onMoveCell={handleMove} onDelete={handleDelete} />
                    <button className="complete-btn" onClick={() => { if (date) { completeTodo(date, entry.entryId); setEntries(prev => prev.map(e => e.entryId === entry.entryId ? { ...e, completedAt: new Date().toISOString() } : e)); showToast('已完成', 'success'); } }}><Circle size={18} /></button>
                  </div>
                </div>
                <div className="timeline-text">{entry.plainPreview.replace(/^- \[ \] /, '')}</div>
              </div>
            </div>
          ))}
        </div>}

        {notes.length > 0 && <div className="timeline-section"><div className="timeline-section-title"><FileText size={14} />记录 ({notes.length})</div>
          {notes.map(entry => (
            <div key={entry.entryId} className="entry-timeline-item">
              <div className="entry-timeline-dot" />
              <div className="entry-timeline-content">
                <div className="entry-timeline-time-row">
                  <span className="timeline-time">{formatTime(entry.createdAt)}</span>
                  {entry.isCarryOver && <span className="carry-badge">&#x21BB; 结转</span>}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                    <EntryContextMenu entry={entry} cells={state.currentTemplate.cells} onChangeType={handleChangeType} onMoveCell={handleMove} onDelete={handleDelete} />
                  </div>
                </div>
                <div className="timeline-text">{entry.plainPreview}</div>
              </div>
            </div>
          ))}
        </div>}

        {doneTodos.length > 0 && <div className="timeline-section"><div className="timeline-section-title"><CheckCircle2 size={14} />已完成 ({doneTodos.length})</div>
          {doneTodos.map(entry => (
            <div key={entry.entryId} className="entry-timeline-item done-item">
              <div className="entry-timeline-dot done" />
              <div className="entry-timeline-content">
                <div className="entry-timeline-time-row">
                  <span className="timeline-time">{formatTime(entry.createdAt)}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                    <EntryContextMenu entry={entry} cells={state.currentTemplate.cells} onChangeType={handleChangeType} onMoveCell={handleMove} onDelete={handleDelete} />
                    <button className="uncomplete-btn" onClick={() => { if (date) { uncompleteTodo(date, entry.entryId); setEntries(prev => prev.map(e => e.entryId === entry.entryId ? { ...e, completedAt: null } : e)); } }}><CheckCircle2 size={18} /></button>
                  </div>
                </div>
                <div className="timeline-text" style={{ textDecoration: 'line-through', opacity: 0.6 }}>{entry.plainPreview.replace(/^- \[ \] /, '').replace(/^- \[x\] /, '')}</div>
              </div>
            </div>
          ))}
        </div>}

        {entries.length === 0 && <div className="entries-empty"><FileText size={32} /><p>暂无记录</p><p style={{ fontSize: 13, marginTop: 4 }}>在下方输入框添加第一条记录</p></div>}
      </div>

      <div className="cell-bottom-input">
        <RichEditor placeholder={`记录 ${cell.name}...`} onSend={handleSend} />
      </div>
    </div>
  );
}
