import { useEffect, useRef, useState } from 'react';

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Counts a whole number up from its previous value; renders the final value at once when motion is reduced.
export default function CountUp({ value, duration = 600 }) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(() => (reduceMotion() ? target : 0));
  const from = useRef(shown);

  useEffect(() => {
    if (reduceMotion() || typeof requestAnimationFrame === 'undefined') {
      setShown(target);
      return undefined;
    }
    const start = performance.now();
    const base = from.current;
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(base + (target - base) * eased);
      from.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return shown;
}
