import {useSyncExternalStore} from 'react';
import {parseDateTime, useTranslation} from '@cloudcart/nitrogen';

/**
 * The time left until `endsAt`, ticking each second: "2 days 03:04:05", or "03:04:05" within a day. Rendered in
 * the browser only, as the server's clock is not the visitor's; nothing once the time is up. `label` puts the
 * time into a sentence ("Ends in {time}").
 */
export function Countdown({
  endsAt,
  label,
  className = '',
}: {
  /** A `DateTime` as the API gives it: UTC, without a zone. */
  endsAt: string;
  label?: (time: string) => string;
  className?: string;
}) {
  const {t} = useTranslation();
  const now = useSyncExternalStore(subscribeToSeconds, currentSecond, () => null);
  // Read as UTC: the native parse takes a date-time without a zone for the visitor's local time (B-386).
  const end = parseDateTime(endsAt)?.getTime();
  if (now === null || end === undefined || end <= now) return null;

  const seconds = Math.floor((end - now) / 1000);
  const days = Math.floor(seconds / 86400);
  const clock = [Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
  const time = days > 0 ? t('cart.countdownDays', {count: days, time: clock}) : clock;

  return (
    // A timer is not read out each second; its text is there when the visitor reaches it.
    <span role="timer" aria-live="off" className={`tabular-nums ${className}`}>
      {label ? label(time) : time}
    </span>
  );
}

// One clock for every countdown on the page: the time, refreshed each second while one shows. A snapshot must
// stay the same between two reads unless the clock moved.
let second = 0;
let ticker: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function currentSecond() {
  if (!second) second = Date.now();
  return second;
}

function subscribeToSeconds(onChange: () => void) {
  listeners.add(onChange);
  ticker ??= setInterval(() => {
    second = Date.now();
    listeners.forEach((listener) => listener());
  }, 1000);
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) {
      clearInterval(ticker);
      ticker = undefined;
      second = 0;
    }
  };
}
