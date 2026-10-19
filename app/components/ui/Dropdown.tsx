import {type ReactNode, useEffect, useId, useRef, useState} from 'react';

/**
 * A button that shows a panel under it — a short list of links or actions, such as the chosen filters that do not fit
 * their row (T-554). The panel closes on Escape (the focus back on the button), a press outside and the focus moving
 * out of it; it stays open while its links are used, so the next is in reach (T-555) — a link that goes away with what
 * it removed hands the focus to the panel. It opens on the side where it fits the screen.
 */
export function Dropdown({
  label,
  icon,
  children,
  className = '',
  buttonClassName = 'size-9',
}: {
  /** The button's name, read out; the button shows `icon`. */
  label: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  /** The button's size, to match what is beside it. */
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [toEnd, setToEnd] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // From the button's left, unless the panel would leave the screen there: then from its right.
    const panel = panelRef.current?.getBoundingClientRect();
    const button = buttonRef.current?.getBoundingClientRect();
    if (panel && button) setToEnd(button.left + panel.width > document.documentElement.clientWidth);

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        // No element took the focus: the one that had it went away (a filter removed), so the panel keeps it.
        if (event.relatedTarget === null) {
          requestAnimationFrame(() => {
            const panel = panelRef.current;
            if (panel && !panel.hidden && (!document.activeElement || document.activeElement === document.body)) {
              panel.focus();
            }
          });
          return;
        }
        setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className={`grid place-items-center rounded-button bg-surface hover:bg-border aria-expanded:bg-border ${buttonClassName}`}
      >
        {icon}
      </button>
      <div
        ref={panelRef}
        id={panelId}
        tabIndex={-1}
        hidden={!open}
        className={`absolute top-full z-40 mt-2 w-max max-w-[calc(100vw-2*var(--spacing-gutter))] rounded-popover border border-border bg-background p-2 shadow-popover ${toEnd ? 'right-0' : 'left-0'}`}
      >
        {children}
      </div>
    </div>
  );
}
