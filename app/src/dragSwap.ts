// Moving a night's dinner by dragging its handle onto another day, which swaps the two nights. Pointer events cover a
// mouse and a finger; the arrow keys cover a keyboard. Nothing is written to the repo until the week is saved.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

export interface DayDrag {
  /** Day (0 = Monday) whose dinner is being dragged. */
  from: number;
  /** The day the pointer is over right now, or null when it's away from the days. */
  over: number | null;
}

/** How far the pointer must move before a press on the handle counts as a drag rather than a tap. */
const SLOP_PX = 6;
/** How near the pointer must be to a day for that day to take the drop, so the gaps between cards still count. */
const NEAR_PX = 24;

interface Session {
  from: number;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  /** The last day reported to React, so a pointer that hasn't changed day doesn't re-render. */
  over: number | null;
}

/** Keeps the page from showing a text selection (and the cursor) while a dinner is in hand. */
function heldStyle(on: boolean): void {
  document.body.style.userSelect = on ? 'none' : '';
  document.body.style.cursor = on ? 'grabbing' : '';
}

/**
 * Drag-one-dinner-onto-another behaviour for the planner. `days` is the days that have something planned, in week
 * order (the days the arrow keys step through); `onSwap` is called with the two days that should trade places.
 */
export function useDayDragSwap(days: number[], onSwap: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<DayDrag | null>(null);
  const elements = useRef(new Map<number, HTMLElement>());
  const session = useRef<Session | null>(null);
  const swap = useRef(onSwap);
  useEffect(() => {
    swap.current = onSwap;
  });

  /** Point the drag at a day's card, so the pointer can be matched to the day under it. */
  const registerDay = useCallback(
    (day: number) => (el: HTMLElement | null) => {
      if (el) elements.current.set(day, el);
      else elements.current.delete(day);
    },
    [],
  );

  /** The day nearest the pointer, or null when the pointer is nowhere near the week. */
  const dayAt = (x: number, y: number): number | null => {
    let found: number | null = null;
    let best = Infinity;
    for (const [day, el] of elements.current) {
      const r = el.getBoundingClientRect();
      const gap = Math.hypot(Math.max(r.left - x, x - r.right, 0), Math.max(r.top - y, y - r.bottom, 0));
      if (gap < best) {
        best = gap;
        found = day;
      }
    }
    return best <= NEAR_PX ? found : null;
  };

  // Listen for the rest of the gesture on the window: the pointer leaves the small handle almost at once.
  useEffect(() => {
    const end = (to: number | null, moved: boolean, from: number) => {
      session.current = null;
      setDrag(null);
      heldStyle(false);
      if (moved && to !== null && to !== from) swap.current(from, to);
    };
    const move = (e: PointerEvent) => {
      const s = session.current;
      if (!s || e.pointerId !== s.pointerId) return;
      if (!s.moved) {
        if (Math.hypot(e.clientX - s.startX, e.clientY - s.startY) < SLOP_PX) return;
        s.moved = true;
        heldStyle(true);
        s.over = dayAt(e.clientX, e.clientY);
        setDrag({ from: s.from, over: s.over });
        return;
      }
      const over = dayAt(e.clientX, e.clientY);
      if (over !== s.over) {
        s.over = over;
        setDrag({ from: s.from, over });
      }
    };
    const drop = (e: PointerEvent) => {
      const s = session.current;
      if (s && e.pointerId === s.pointerId) end(s.over, s.moved, s.from);
    };
    const cancel = (e: PointerEvent) => {
      const s = session.current;
      if (s && e.pointerId === s.pointerId) end(null, false, s.from);
    };
    const escape = (e: KeyboardEvent) => {
      const s = session.current;
      if (e.key === 'Escape' && s) end(null, false, s.from);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', drop);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', drop);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', escape);
      heldStyle(false);
    };
  }, []);

  const onPointerDown = (day: number) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    session.current = { from: day, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false, over: null };
  };

  /** Arrow keys move the dinner one planned day at a time, for anyone who can't drag. */
  const onKeyDown = (day: number) => (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = days.indexOf(day);
    const to = i === -1 ? undefined : days[i + step];
    if (to !== undefined) swap.current(day, to);
  };

  return {
    /** What's being dragged right now, for the day cards to highlight. */
    drag,
    /** Attach to each day's card. */
    registerDay,
    /** Attach to each day's drag handle. */
    handleProps: (day: number) => ({ onPointerDown: onPointerDown(day), onKeyDown: onKeyDown(day) }),
  };
}
