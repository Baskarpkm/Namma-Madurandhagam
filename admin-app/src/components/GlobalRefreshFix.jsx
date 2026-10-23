import { useEffect } from 'react';

export default function GlobalRefreshFix() {
  useEffect(() => {
    const onClick = (event) => {
      const trigger = event.target?.closest?.('button, a');
      if (!trigger) return;
      const refreshIcon = trigger.querySelector?.('svg.lucide-refresh-cw');
      if (!refreshIcon) return;
      event.preventDefault();
      event.stopPropagation();
      window.location.reload();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  return null;
}
