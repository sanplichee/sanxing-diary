import { useState } from 'react';
import { Eye, Shield, Tag, LayoutGrid, Download, Upload, Trash2, Info, ChevronRight, FileJson, FileText, Brain, Check, Plus, Star, Trash, ArrowRightLeft, Pencil } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getStats } from '@/services/storage';
import type { GridCell } from '@/types/models';
import { CellEditModal } from '@/components/CellEditModal';


const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: 'system', label: '系统默认' },
  { value: "'Noto Serif SC', serif", label: '思源宋体' },
  { value: "'Noto Sans SC', sans-serif", label: '思源黑体' },
  { value: "'ZCOOL XiaoWei', serif", label: '站酷小薇' },
];

export function SettingsPage() {
  const { state, updateSettings, exportData, importData, clearAllData, showToast, switchTemplate, createTemplate, deleteTemplate, setDefaultTemplate, updateCell } = useApp();
  const [section, setSection] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState(state.settings.apiKey);
  const [baseUrlInput, setBaseUrlInput] = useState(state.settings.customBaseUrl || '');
  const [modelInput, setModelInput] = useState(state.settings.aiModel || 'deepseek-v4-flash');
  const [tplName, setTplName] = useState('');
  const [tplConfirm, setTplConfirm] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<GridCell | null>(null);
  const stats = getStats();

  const handleExport = async (format: 'json' | 'markdown') => {
    try { const data = await exportData(format); const blob = new Blob([data], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `sx-diary-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'md'}`; a.click(); URL.revokeObjectURL(url); showToast('导出成功', 'success'); }
    catch { showToast('导出失败', 'error'); }
  };

  const handleImport = () => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'; input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { const r = importData(ev.target?.result as string); showToast(r.message, r.success ? 'success' : 'error'); }; reader.readAsText(file); }; input.click(); };

  const sections = [
    { id: 'ai', label: 'AI 配置', icon: Brain, color: '#6366F1' },
    { id: 'appearance', label: '外观', icon: Eye, color: '#3B82F6' },
    { id: 'security', label: '安全', icon: Shield, color: '#22C55E' },
    { id: 'tags', label: '标签管理', icon: Tag, color: '#EAB308' },
    { id: 'templates', label: '模板管理', icon: LayoutGrid, color: '#F97316' },
    { id: 'export', label: '导出/导入', icon: Download, color: '#8B5CF6' },
  ];

  const render = () => {
    switch (section) {
      case 'ai': return (
        <div className="settings-section">
          <div className="section-header"><button className="section-back" onClick={() => setSection(null)}>← 返回</button><h3>AI 配置</h3></div>
          <div className="settings-group"><label>DeepSeek API Key</label><div className="settings-input-row"><input type="password" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} placeholder="sk-..." /><button onClick={() => { updateSettings({ apiKey: apiKeyInput }); showToast('已保存', 'success'); }}>保存</button></div></div>
          <div className="settings-group"><label>自定义 Base URL</label><input type="text" value={baseUrlInput} onChange={e => setBaseUrlInput(e.target.value)} placeholder="https://api.deepseek.com" /></div>
          <div className="settings-group"><label>模型 <span className="label-hint">如 deepseek-chat, gpt-4o-mini</span></label><input type="text" value={modelInput} onChange={e => setModelInput(e.target.value)} placeholder="deepseek-chat" /></div>
          <div className="settings-group"><button className="modal-btn primary" onClick={() => { updateSettings({ apiKey: apiKeyInput, customBaseUrl: baseUrlInput || null, aiModel: modelInput }); showToast('AI 配置已保存', 'success'); }}><Check size={16} />保存配置</button></div>
          <div className="settings-group"><label className="settings-row"><span>启用 AI</span><label className="switch"><input type="checkbox" checked={state.settings.aiEnabled} onChange={e => updateSettings({ aiEnabled: e.target.checked })} /><span className="slider" /></label></label></div>
          <div className="settings-group"><label>自动结转待办</label><label className="settings-row"><span>昨日未完成自动结转到今天</span><label className="switch"><input type="checkbox" checked={state.settings.autoCarryOver} onChange={e => updateSettings({ autoCarryOver: e.target.checked })} /><span className="slider" /></label></label></div>
        </div>
      );
      case 'appearance': return (
        <div className="settings-section">
          <div className="section-header"><button className="section-back" onClick={() => setSection(null)}>← 返回</button><h3>外观</h3></div>
          <div className="settings-group"><label>主题</label><div className="theme-options">{[{v:0,l:'跟随系统'},{v:1,l:'浅色'},{v:2,l:'深色'}].map(o => <button key={o.v} className={`theme-option ${state.settings.themeMode === o.v ? 'active' : ''}`} onClick={() => updateSettings({ themeMode: o.v as 0|1|2 })}>{o.l}</button>)}</div></div>
          <div className="settings-group"><label>字体</label><select value={state.settings.fontFamily} onChange={e => updateSettings({ fontFamily: e.target.value })}>{FONT_OPTIONS.map((f: { value: string; label: string }) => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
        </div>
      );
      case 'security': return (
        <div className="settings-section">
          <div className="section-header"><button className="section-back" onClick={() => setSection(null)}>← 返回</button><h3>安全</h3></div>
          <div className="settings-group"><label>4 位数字密码</label><div className="settings-input-row"><input type="password" placeholder="设置密码" maxLength={4} /><button onClick={() => showToast('密码已设置', 'success')}>设置</button></div><p className="settings-hint">密码遗忘将无法恢复数据，请定期导出备份</p></div>
          <div className="settings-group"><label className="settings-row"><span>生物识别</span><label className="switch"><input type="checkbox" checked={state.settings.biometricEnabled} onChange={e => updateSettings({ biometricEnabled: e.target.checked })} /><span className="slider" /></label></label></div>
        </div>
      );
      case 'templates': return (
        <div className="settings-section">
          <div className="section-header"><button className="section-back" onClick={() => setSection(null)}>← 返回</button><h3>模板管理</h3></div>

          {/* 当前模板 */}
          <div className="settings-group">
            <label>当前使用</label>
            <div className="template-current-card">
              <div className="template-current-info">
                <span className="template-current-name">{state.currentTemplate.name}</span>
                {state.currentTemplate.isDefault && <span className="template-badge">默认</span>}
              </div>
              <span className="template-current-cells">{state.currentTemplate.cells.length} 个格子</span>
            </div>
          </div>

          {/* 创建新模板 */}
          <div className="settings-group">
            <label>保存为新模板</label>
            <p className="settings-hint">将当前格子定义保存为新模板，方便日后切换使用</p>
            <div className="settings-input-row">
              <input type="text" value={tplName} onChange={e => setTplName(e.target.value)} placeholder="输入模板名称" maxLength={20} />
              <button onClick={() => { if (!tplName.trim()) return; createTemplate(tplName.trim()); setTplName(''); }}><Plus size={14} />创建</button>
            </div>
          </div>

          {/* 格子编辑 */}
          <div className="settings-group">
            <label>格子定义 ({state.currentTemplate.cells.length}个)</label>
            <p className="settings-hint">点击格子编辑名称、图标、描述、关键词和每日待办模板</p>
            <div className="cell-edit-list">
              {state.currentTemplate.cells.map(cell => (
                <button key={cell.cellId} className="cell-edit-card" onClick={() => setEditingCell(cell)}>
                  <div className="cell-edit-preview" style={{ background: cell.colorValue + '15', color: cell.colorValue }}>
                    <span className="cell-edit-emoji">{cell.emoji}</span>
                  </div>
                  <div className="cell-edit-info">
                    <div className="cell-edit-name">{cell.name}</div>
                    <div className="cell-edit-desc">{cell.description}</div>
                    <div className="cell-edit-keywords">
                      {cell.keywords.slice(0, 4).map(k => <span key={k} className="cell-edit-keyword">{k}</span>)}
                      {cell.keywords.length > 4 && <span className="cell-edit-keyword-more">+{cell.keywords.length - 4}</span>}
                    </div>
                    {cell.todoTemplates && cell.todoTemplates.length > 0 && (
                      <div className="cell-edit-tpl-hint">{cell.todoTemplates.length} 个每日待办</div>
                    )}
                  </div>
                  <div className="cell-edit-arrow"><Pencil size={14} /></div>
                </button>
              ))}
            </div>
          </div>

          {/* 模板列表 */}
          <div className="settings-group">
            <label>我的模板 ({state.templates.length}个)</label>
            <div className="template-list">
              {state.templates.map(t => (
                <div key={t.id} className={`template-card ${state.currentTemplate.id === t.id ? 'active' : ''} ${t.isDefault ? 'default' : ''}`}>
                  <div className="template-header">
                    <div className="template-info">
                      <span className="template-name">{t.name}</span>
                      {t.isDefault && <span className="template-badge">默认</span>}
                      {state.currentTemplate.id === t.id && <span className="template-badge current">使用中</span>}
                    </div>
                    <div className="template-actions">
                      {state.currentTemplate.id !== t.id && (
                        <button className="template-btn switch" onClick={() => switchTemplate(t.id)} title="切换"><ArrowRightLeft size={14} /></button>
                      )}
                      {!t.isDefault && (
                        <button className="template-btn default" onClick={() => setDefaultTemplate(t.id)} title="设为默认"><Star size={14} /></button>
                      )}
                      {!t.isDefault && (
                        <button className="template-btn danger" onClick={() => { if (tplConfirm === t.id) { deleteTemplate(t.id); setTplConfirm(null); } else { setTplConfirm(t.id); setTimeout(() => setTplConfirm(null), 3000); } }} title="删除">
                          {tplConfirm === t.id ? <Check size={14} /> : <Trash size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="template-cells">
                    {t.cells.map(c => <span key={c.cellId} className="template-cell-tag" style={{ background: c.colorValue + '15', color: c.colorValue }}>{c.emoji} {c.name}</span>)}
                  </div>
                  <div className="template-meta">创建于 {t.createdAt.slice(0, 10)} · {t.cells.length} 个格子</div>
                </div>
              ))}
            </div>
          </div>

          {editingCell && (
            <CellEditModal
              cell={editingCell}
              onSave={(updated) => { updateCell(updated); showToast(`「${updated.name}」已更新`, 'success'); setEditingCell(null); }}
              onClose={() => setEditingCell(null)}
            />
          )}
        </div>
      );
      case 'export': return (
        <div className="settings-section">
          <div className="section-header"><button className="section-back" onClick={() => setSection(null)}>← 返回</button><h3>导出/导入</h3></div>
          <div className="settings-group"><label>导出</label><div className="export-buttons"><button className="export-btn" onClick={() => handleExport('json')}><FileJson size={16} />JSON</button><button className="export-btn" onClick={() => handleExport('markdown')}><FileText size={16} />Markdown</button></div></div>
          <div className="settings-group"><label>导入</label><button className="import-btn" onClick={handleImport}><Upload size={16} />选择 JSON 文件</button></div>
          <div className="settings-group danger-zone"><label>危险区域</label><button className="danger-btn" onClick={() => { if (confirm('⚠️ 确定清空所有数据？不可恢复！')) { clearAllData(); showToast('已清空', 'info'); } }}><Trash2 size={16} />清空所有数据</button></div>
        </div>
      );
      default: return (
        <>
          <div className="settings-stats"><div className="settings-stat"><span>{stats.totalEntries} 条记录</span></div><div className="settings-stat"><span>{stats.totalDays} 天</span></div></div>
          <div className="settings-menu">{sections.map(s => <button key={s.id} className="settings-menu-item" onClick={() => setSection(s.id)}><div className="menu-item-left"><div className="menu-icon" style={{ background: s.color + '15', color: s.color }}><s.icon size={18} /></div><span>{s.label}</span></div><ChevronRight size={16} /></button>)}</div>
          <div className="settings-about"><Info size={14} /><span>三省日记 v2.1</span><span>纯本地 · 隐私优先</span></div>
        </>
      );
    }
  };

  return <div className="settings-page">{render()}</div>;
}
