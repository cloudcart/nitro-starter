import {useEffect, useId, useRef, useState} from 'react';
import {useTranslation} from '@cloudcart/nitrogen';
import {RichText} from '@cloudcart/nitrogen-react';

/**
 * A listing's description from the merchant, under its products (`ProductListing`'s `after`): two lines, and a third fading into whatever
 * lies behind it; "Show more" opens the rest with an animation, "Show less" folds it again. A text that fits in three
 * lines shows whole, with no button. Nothing without a description.
 */
export function ListingDescription({html, className = ''}: {html?: string | null; className?: string}) {
  const {t} = useTranslation();
  const textId = useId();
  const textRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // Whether the text is longer than its three folded lines; until measured in the browser, it is taken to be.
  const [long, setLong] = useState(true);

  useEffect(() => {
    const text = textRef.current;
    if (!text || typeof ResizeObserver === 'undefined') return;
    // The content's own height against three of its lines, whether it is folded or open.
    const observer = new ResizeObserver(() => {
      const line = parseFloat(getComputedStyle(text).lineHeight) || 0;
      setLong(text.scrollHeight > line * 3 + 1);
    });
    observer.observe(text);
    return () => observer.disconnect();
  }, []);

  if (!html) return null;

  return (
    <section className={`max-w-reading ${className}`}>
      <div ref={textRef} id={textId} className={`fold ${long && !open ? 'folded' : ''}`}>
        <RichText data={html} headingStart={2} className="prose prose-tokens max-w-none text-muted" />
      </div>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={textId}
          onClick={() => setOpen((value) => !value)}
          className="mt-2 text-small font-medium underline underline-offset-4"
        >
          {open ? t('listing.showLess') : t('listing.showMore')}
        </button>
      )}
    </section>
  );
}
