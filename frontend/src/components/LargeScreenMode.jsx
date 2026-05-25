import { useState } from 'react';

export default function LargeScreenToggle() {
  const [on, setOn] = useState(false);

  const toggle = () => {
    const root = document.getElementById('root');
    if (!root) return;
    const next = !on;
    setOn(next);
    if (next) {
      root.classList.add('large-screen');
    } else {
      root.classList.remove('large-screen');
    }
  };

  return (
    <button onClick={toggle}
      style={{
        background: on ? 'var(--accent)' : 'transparent',
        color: on ? '#000' : 'var(--text-dim)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '3px 10px',
        fontSize: 11,
        cursor: 'pointer',
        marginLeft: 'auto',
      }}>
      {on ? '退出大屏' : '大屏展示'}
    </button>
  );
}
