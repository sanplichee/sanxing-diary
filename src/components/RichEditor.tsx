import { useState, useRef, useCallback } from 'react';
import { Send, Image, Hash, AtSign, List } from 'lucide-react';

interface RichEditorProps {
  placeholder?: string;
  onSend: (text: string, images: string[]) => void;
  disabled?: boolean;
}

export function RichEditor({ placeholder = '此刻的想法是...', onSend, disabled }: RichEditorProps) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAutoResize = useCallback(() => {
    const t = textareaRef.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 160) + 'px';
  }, []);

  const handleSend = () => {
    if (!text.trim() && images.length === 0) return;
    onSend(text.trim(), images);
    setText('');
    setImages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleImageUpload = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) return; // 5MB limit
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) setImages(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  const insertTag = () => {
    const t = textareaRef.current;
    if (!t) return;
    const start = t.selectionStart;
    const before = text.slice(0, start);
    const after = text.slice(start);
    setText(before + '#标签 ' + after);
    setTimeout(() => { t.focus(); t.setSelectionRange(start + 5, start + 5); }, 0);
  };

  const insertMention = () => {
    const t = textareaRef.current;
    if (!t) return;
    const start = t.selectionStart;
    const before = text.slice(0, start);
    const after = text.slice(start);
    setText(before + '@' + after);
    setTimeout(() => { t.focus(); t.setSelectionRange(start + 1, start + 1); }, 0);
  };

  const insertList = () => {
    const t = textareaRef.current;
    if (!t) return;
    const start = t.selectionStart;
    const before = text.slice(0, start);
    const after = text.slice(start);
    const hasNewline = before.length === 0 || before.endsWith('\n');
    setText(before + (hasNewline ? '' : '\n') + '- ' + after);
    setTimeout(() => { t.focus(); t.setSelectionRange(start + (hasNewline ? 2 : 3), start + (hasNewline ? 2 : 3)); }, 0);
  };

  return (
    <div className="rich-editor-wrapper">
      <textarea
        ref={textareaRef}
        className="rich-editor-textarea"
        placeholder={disabled ? 'AI 正在分析...' : placeholder}
        value={text}
        onChange={e => { setText(e.target.value); handleAutoResize(); }}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); } }}
        disabled={disabled}
        rows={1}
      />

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="editor-image-preview-list">
          {images.map((img, i) => (
            <div key={i} className="editor-image-preview">
              <img src={img} alt="" />
              <button className="editor-image-remove" onClick={() => removeImage(i)}>×</button>
            </div>
          ))}
        </div>
      )}

      <div className="rich-editor-toolbar">
        <div className="rich-editor-tools">
          <button className="rich-editor-tool" onClick={insertTag} title="添加标签 #"><Hash size={16} /></button>
          <button className="rich-editor-tool" onClick={handleImageUpload} title="插入图片"><Image size={16} /></button>
          <div className="rich-editor-sep" />
          <button className="rich-editor-tool" onClick={insertList} title="列表"><List size={16} /></button>
          <button className="rich-editor-tool" onClick={insertMention} title="提及 @"><AtSign size={16} /></button>
          <div className="rich-editor-sep" />
          <span className="editor-hint">⌘+Enter 发送</span>
        </div>
        <button className="rich-editor-send" onClick={handleSend} disabled={(!text.trim() && images.length === 0) || disabled}>
          <Send size={14} />
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
    </div>
  );
}
