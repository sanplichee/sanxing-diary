import { useState } from 'react';
import { MoreVertical, FileText, ListTodo, ArrowRightLeft, Trash2, X } from 'lucide-react';
import type { CanvasEntry, GridCell } from '@/types/models';

interface Props {
  entry: CanvasEntry;
  cells: GridCell[];
  onChangeType: (eid: string, nt: 'todo' | 'note') => void;
  onMoveCell: (eid: string, ncid: string) => void;
  onDelete: (eid: string) => void;
}

export function EntryContextMenu({ entry, cells, onChangeType, onMoveCell, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [showMove, setShowMove] = useState(false);

  return (
    <div className="entry-menu-wrapper">
      <button className="entry-menu-trigger" onClick={() => setOpen(!open)}><MoreVertical size={14} /></button>
      {open && (
        <>
          <div className="entry-menu-overlay" onClick={() => { setOpen(false); setShowMove(false); }} />
          <div className="entry-menu-dropdown">
            {!showMove ? (
              <>
                <div className="entry-menu-header"><span>修改条目</span><button onClick={() => setOpen(false)}><X size={14} /></button></div>
                <button onClick={() => { onChangeType(entry.entryId, entry.entryType === 'todo' ? 'note' : 'todo'); setOpen(false); }}>
                  {entry.entryType === 'todo' ? <><FileText size={14} />转为记录</> : <><ListTodo size={14} />转为待办</>}
                </button>
                <button onClick={() => setShowMove(true)}><ArrowRightLeft size={14} />移动格子</button>
                <button onClick={() => { onDelete(entry.entryId); setOpen(false); }} className="danger"><Trash2 size={14} />删除</button>
              </>
            ) : (
              <>
                <div className="entry-menu-header"><button onClick={() => setShowMove(false)}>← 返回</button></div>
                {cells.map(c => (
                  <button key={c.cellId} onClick={() => { onMoveCell(entry.entryId, c.cellId); setOpen(false); setShowMove(false); }}>
                    <span style={{ fontSize: 16 }}>{c.emoji}</span> {c.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
