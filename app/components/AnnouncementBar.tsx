import {KeptLink} from '@cloudcart/nitrogen-react';
import {useEffect, useState, useSyncExternalStore} from 'react';
import {useTranslation} from '@cloudcart/nitrogen';
import {ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon} from '~/components/ui/icons';
import {ANNOUNCEMENTS} from '~/lib/announcements';
import {REDUCED_MOTION, subscribeToReducedMotion} from '~/lib/motion';

/** How long a message stays before the next one. */
const ROTATE_MS = 5000;

/**
 * The bar above the header: the messages in `app/lib/announcements.ts`, one at a time. Several rotate every five
 * seconds, stop while the bar is hovered or holds focus, and can be paused (WCAG 2.2.2); for a visitor who asks for
 * less motion they do not rotate by themselves. The previous and next buttons step through them.
 */
export function AnnouncementBar({
  shopName,
  messages = ANNOUNCEMENTS,
}: {
  shopName: string;
  /** The messages, `app/lib/announcements.ts`'s by default. */
  messages?: typeof ANNOUNCEMENTS;
}) {
  const {t} = useTranslation();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  // The server and the first render do not rotate: the browser's preference is read after hydration.
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
  const count = messages.length;
  const rotating = count > 1 && !paused && !held && !reducedMotion;

  useEffect(() => {
    if (!rotating) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), ROTATE_MS);
    return () => clearInterval(timer);
  }, [rotating, count]);

  const message = messages[index];
  if (!message) return null;
  const text = t(message.text, {shop: shopName});
  const control = 'grid size-8 place-items-center rounded-full hover:bg-background/15';

  return (
    <section
      aria-label={t('announcements.label')}
      // On the dark bar the focus ring is in the background colour, so it shows (B-194).
      className="bg-foreground text-small text-background [&_:focus-visible]:outline-background"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false);
      }}
    >
      <div className="mx-auto flex min-h-9 max-w-page items-center gap-2 px-gutter md:px-gutter-md">
        {count > 1 && (
          <button
            type="button"
            aria-label={t('announcements.previous')}
            className={control}
            onClick={() => setIndex((index - 1 + count) % count)}
          >
            <ChevronLeftIcon className="size-4" />
          </button>
        )}
        {/* A message the visitor stepped to is read out; rotating ones are not, so a screen reader is not interrupted. */}
        <p aria-live={rotating ? 'off' : 'polite'} className="flex-1 py-2 text-center">
          {message.to ? (
            <KeptLink to={message.to} className="underline-offset-4 hover:underline">
              {text}
            </KeptLink>
          ) : (
            text
          )}
        </p>
        {count > 1 && (
          <>
            {!reducedMotion && (
              <button
                type="button"
                aria-label={paused ? t('announcements.play') : t('announcements.pause')}
                className={control}
                onClick={() => setPaused(!paused)}
              >
                {paused ? <PlayIcon className="size-4" /> : <PauseIcon className="size-4" />}
              </button>
            )}
            <button
              type="button"
              aria-label={t('announcements.next')}
              className={control}
              onClick={() => setIndex((index + 1) % count)}
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
