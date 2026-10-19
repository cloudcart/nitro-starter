import {type ReactNode, type RefObject, useEffect, useId, useLayoutEffect, useRef} from 'react';
import {useTranslation} from '@cloudcart/nitrogen';
import {CloseIcon} from '~/components/ui/icons';

type DialogProps = {
  /** Whether it is open. While it is, the rest of the page is inert and does not scroll. */
  open: boolean;
  /** The visitor closed it: the close button, Escape, or a click outside it. Set `open` to false. */
  onClose: () => void;
  /** Its title, which also names it for screen readers. */
  heading: ReactNode;
  children?: ReactNode;
  /**
   * `modal`: a box in the middle of the screen; `drawer`: a full-height panel along one side; `float`: a wider box
   * near the top of the screen that rises into place, the whole screen on a phone (the search); `fullscreen`: the
   * whole screen, with no colour or motion of its own: its content draws them (the product gallery, whose photograph
   * flies into it from the page).
   */
  variant?: 'modal' | 'drawer' | 'float' | 'fullscreen';
  /** The drawer's side. */
  side?: 'left' | 'right';
  /** What takes focus when it opens — the search's input, say. The browser's choice by default: its first control. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * No title row: the heading names the dialog for screen readers only, and the content brings its own close button
   * and lays out its own scrolling (the search, whose first row is its input).
   */
  bare?: boolean;
};

const VARIANTS = {
  modal:
    'm-auto max-h-[calc(100dvh-2*var(--spacing-dialog-edge))] w-[min(var(--container-dialog),calc(100vw-2*var(--spacing-dialog-edge)))] rounded-popover opacity-0 open:opacity-100 starting:open:opacity-0 transition-[opacity,display,overlay] duration-200',
  drawer:
    'my-0 h-dvh max-h-none w-[min(var(--container-drawer),100vw)] max-w-none transition-[translate,display,overlay] duration-300 ease-out open:translate-x-0',
  float:
    'm-0 h-dvh max-h-none w-screen max-w-none md:mx-auto md:mt-search-top md:mb-auto md:h-auto md:max-h-[calc(100dvh-2*var(--spacing-search-top))] md:w-[min(var(--container-search),calc(100vw-2*var(--spacing-dialog-edge)))] md:rounded-popover md:shadow-popover opacity-0 translate-y-4 open:opacity-100 open:translate-y-0 starting:open:opacity-0 starting:open:translate-y-4 transition-[opacity,translate,display,overlay] duration-300 ease-out',
  fullscreen: 'm-0 h-dvh max-h-none w-screen max-w-none bg-transparent backdrop:bg-transparent',
};

/** The box's colour and the dimmed page behind it, for every variant but `fullscreen`, which draws its own. */
const SURFACE =
  'bg-background backdrop:bg-shade/30 backdrop:opacity-0 backdrop:transition-opacity backdrop:duration-300 open:backdrop:opacity-100 starting:open:backdrop:opacity-0';

const SIDES = {
  right: 'mr-0 ml-auto translate-x-full starting:open:translate-x-full',
  left: 'ml-0 mr-auto -translate-x-full starting:open:-translate-x-full',
};

/**
 * The one dialog of the storefront: the browser's own `<dialog>`, shown as a modal. Focus moves into it and
 * stays there, the page under it is inert, Escape and a click outside close it, and focus goes back to what
 * opened it. The cart, menu and filter drawers, the search panel and every modal box are this component.
 */
export function Dialog({
  open,
  onClose,
  heading,
  children,
  variant = 'modal',
  side = 'right',
  initialFocusRef,
  bare = false,
}: DialogProps) {
  const {t} = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  // Whether the press began outside the box: a text selection dragged out of it is not a click outside.
  const pressedOutsideRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      initialFocusRef?.current?.focus();
    } else if (!open && dialog.open) dialog.close();
  }, [open, initialFocusRef]);

  // A parent that removes the dialog while it is open closes it first, while it is still in the page: closing is what
  // gives the focus back to what opened it, and a removed dialog leaves it nowhere (B-195). A layout effect's cleanup
  // runs before the element leaves the page.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    // eslint-disable-next-line jsx-a11y-x/click-events-have-key-events, jsx-a11y-x/no-noninteractive-element-interactions -- a click outside is the pointer's way to close; the keyboard's are Escape and the close button
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={headingId}
      // Escape closes the dialog in the browser; the state follows. A close the state asked for has `open` false.
      onClose={() => {
        if (open) onClose();
      }}
      // The backdrop belongs to the dialog element; everything inside the box is its children.
      onPointerDown={(event) => {
        pressedOutsideRef.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedOutsideRef.current && event.target === event.currentTarget) onClose();
      }}
      className={`p-0 text-foreground transition-discrete ${variant === 'fullscreen' ? '' : SURFACE} ${VARIANTS[variant]} ${variant === 'drawer' ? SIDES[side] : ''}`}
    >
      {/* The column keeps to the box's maximum height, so a long body scrolls under the heading. */}
      <div className="flex h-full max-h-[inherit] flex-col">
        {bare ? (
          <>
            <h2 id={headingId} className="sr-only">
              {heading}
            </h2>
            {children}
          </>
        ) : (
          <>
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4">
              <h2 id={headingId} className="text-heading">
                {heading}
              </h2>
              <button
                type="button"
                aria-label={t('actions.close')}
                // 44 px to touch (B-401); the negative margins keep the icon and the row where a 40 px button had them.
                className="-my-0.5 -mr-2.5 rounded-button p-2.5 text-muted hover:text-foreground"
                onClick={onClose}
              >
                <CloseIcon aria-hidden="true" className="size-6" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </>
        )}
      </div>
    </dialog>
  );
}
