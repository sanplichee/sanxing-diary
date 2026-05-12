import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { GridCell } from '@/types/models';

const EMOJI_OPTIONS = [
  '💼','📚','🌿','🏠','💰','👥','🎨','🧘','💡',
  '📝','📅','📊','🎯','🏃','🍽️','😴','✈️','🎵',
  '📸','🎮','☕','🧹','🛒','📞','❤️','🌱','🔧',
  '⏰','💭','🎓','🏆','🔥','⚡','🌙','🌞','🌈',
];

const COLOR_OPTIONS = [
  '#6366F1','#3B82F6','#10B981','#F59E0B','#8B5CF6',
  '#EC4899','#14B8A6','#F97316','#EF4444','#06B6D4',
  '#84CC16','#A855F7','#64748B','#D946EF','#EAB308',
];

interface CellEditModalProps {
  cell: GridCell;
  onSave: (cell: GridCell) => void;
  onClose: () => void;
}

export function CellEditModal({ cell, onSave, onClose }: CellEditModalProps) {
  const [name, setName] = useState(cell.name);
  const [emoji, setEmoji] = useState(cell.emoji);
  const [color, setColor] = useState(cell.colorValue);
  const [description, setDescription] = useState(cell.description);
  const [keywords, setKeywords] = useState(cell.keywords.join(', '));
  const [todoTemplates, setTodoTemplates] = useState(cell.todoTemplates || []);
  const [newTemplate, setNewTemplate] = useState('');

  useEffect(() => {
    setName(cell.name);
    setEmoji(cell.emoji);
    setColor(cell.colorValue);
    setDescription(cell.description);
    setKeywords(cell.keywords.join(', '));
    setTodoTemplates(cell.todoTemplates || []);
  }, [cell]);

  const handleSave = () => {
    onSave({
      ...cell,
      name: name.trim(),
      emoji,
      colorValue: color,
      description: description.trim(),
      keywords: keywords.split(/[,，、\s]+/).filter(k => k.trim()),
      todoTemplates: todoTemplates.filter(t => t.trim()),
    });
    onClose();
  };

  const addTemplate = () => {
    if (!newTemplate.trim()) return;
    setTodoTemplates([...todoTemplates, newTemplate.trim()]);
    setNewTemplate('');
  };

  const removeTemplate = (idx: number) => {
    setTodoTemplates(todoTemplates.filter((_, i) => i !== idx));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cell-edit-modal" onClick={e => e.stopPropagation()}>
        <div className="cell-edit-header">
          <h3>编辑格子</h3>
          <button className="cell-edit-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="cell-edit-body">
          {/* 名称 */}
          <div className="cell-edit-row">
            <label>名称</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="如：工作" maxLength={8} />
          </div>

          {/* 图标 */}
          <div className="cell-edit-row">
            <label>图标</label>
            <div className="cell-edit-emojis">
              {EMOJI_OPTIONS.map(e => (
                <button key={e} className={`emoji-option ${emoji === e ? 'active' : ''}`} onClick={() => setEmoji(e)}>{e}</button>
              ))}
            </div>
          </div>

          {/* 颜色 */}
          <div className="cell-edit-row">
            <label>颜色</label>
            <div className="cell-edit-colors">
              {COLOR_OPTIONS.map(c => (
                <button key={c} className={`color-option ${color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>

          {/* 用途描述 */}
          <div className="cell-edit-row">
            <label>用途描述</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="描述这个格子的用途，帮助AI理解归类" rows={2} />
          </div>

          {/* 匹配关键词 */}
          <div className="cell-edit-row">
            <label>匹配关键词 <span className="edit-hint">用逗号分隔</span></label>
            <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="如：工作, 会议, 项目, 邮件" />
          </div>

          {/* 每日待办模板 */}
          <div className="cell-edit-row">
            <label>每日待办模板</label>
            <div className="cell-edit-templates">
              {todoTemplates.map((t, i) => (
                <div key={i} className="cell-edit-template-tag">
                  <span>{t}</span>
                  <button onClick={() => removeTemplate(i)}><Trash2 size={12} /></button>
                </div>
              ))}
              <div className="cell-edit-template-add">
                <input type="text" value={newTemplate} onChange={e => setNewTemplate(e.target.value)} placeholder="添加每日待办..." onKeyDown={e => e.key === 'Enter' && addTemplate()} />
                <button onClick={addTemplate} disabled={!newTemplate.trim()}><Plus size={14} /></button>
              </div>
            </div>
          </div>
        </div>

        <div className="cell-edit-footer">
          <button className="cell-edit-save" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
}
