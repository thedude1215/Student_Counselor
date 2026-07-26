import { useEffect, useState } from 'react';

const COLORS = ['#77CC5B', '#FFBB33', '#F472B6', '#4ADE80', '#FDE68A', '#34D399'];

// Lightweight DOM confetti burst — no library. Renders `count` particles with
// randomized trajectory/rotation via inline CSS custom properties, then unmounts.
export default function Confetti({ count = 46, duration = 2600, onDone }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * (0.15 + 0.7 * (i / count))) + (Math.PI * 0.15);
      const velocity = 120 + ((i * 53) % 160);
      return {
        id: i,
        // horizontal drift + upward launch, gravity handled by keyframe
        dx: Math.cos(angle) * velocity * (i % 2 === 0 ? 1 : -1),
        dy: -(180 + ((i * 37) % 220)),
        rot: ((i * 47) % 720) - 360,
        color: COLORS[i % COLORS.length],
        delay: (i % 6) * 30,
        left: 8 + ((i * 71) % 84),
        size: 6 + ((i * 13) % 7),
        round: i % 3 === 0,
      };
    })
  );

  useEffect(() => {
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
  }, [duration, onDone]);

  return (
    <div className="jrn-confetti" aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.id}
          className="jrn-confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.5,
            background: p.color,
            borderRadius: p.round ? '50%' : '1px',
            animationDelay: `${p.delay}ms`,
            '--cf-dx': `${p.dx}px`,
            '--cf-dy': `${p.dy}px`,
            '--cf-rot': `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}
