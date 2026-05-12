import { useApp } from '@/context/AppContext';
import { CheckCircle, XCircle, Info } from 'lucide-react';

export function Toast() {
  const { state } = useApp();

  if (!state.toast) return null;

  const icons = {
    success: <CheckCircle size={18} />,
    error: <XCircle size={18} />,
    info: <Info size={18} />,
  };

  return (
    <div className={`toast-container toast-${state.toast.type}`}>
      {icons[state.toast.type]}
      <span>{state.toast.message}</span>
    </div>
  );
}
