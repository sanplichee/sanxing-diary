import { useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { GridTab } from '@/components/GridTab';
import { DailyBanner } from '@/components/DailyBanner';
import { CarryOverBanner } from '@/components/CarryOverBanner';
import type { ClassifiedItem } from '@/services/aiService';
import { AiClassifyModal } from '@/components/AiClassifyModal';

export function HomePage() {
  const { state, sendFlashNote, confirmFlashItems } = useApp();
  const [showBanner, setShowBanner] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalState, setModalState] = useState<{ flashId: string; text: string; items: ClassifiedItem[] } | null>(null);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const result = await sendFlashNote(text);
      setText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      if (result.items.length > 0) {
        setModalState({ flashId: result.flashId, text, items: result.items });
        setModalOpen(true);
      }
    } finally { setSending(false); }
  };

  return (
    <div className="home-page">
      {showBanner && <DailyBanner onClose={() => setShowBanner(false)} />}
      <CarryOverBanner />
      <div className="home-flash-area">
        <div className="flash-input-container">
          <textarea ref={textareaRef} className="home-flash-textarea" placeholder={sending ? "AI 正在分析..." : "此刻，在想什么？"} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; }} rows={1} disabled={sending} />
          <button className="home-flash-send" onClick={handleSend} disabled={!text.trim() || sending}>{sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}</button>
        </div>
        <p className="flash-hint">输入后 AI 自动归类（支持多任务拆分）</p>
      </div>
      <div className="home-grid-area"><GridTab /></div>
      {modalOpen && modalState && (
        <AiClassifyModal text={modalState.text} items={modalState.items} cells={state.currentTemplate.cells}
          onConfirm={(items) => { confirmFlashItems(modalState.flashId, items); setModalOpen(false); }}
          onCancel={() => setModalOpen(false)} />
      )}
    </div>
  );
}
