import {useState} from 'react';
import {useTranslation} from '@cloudcart/nitrogen';
import {MinusIcon, PlusIcon} from '~/components/ui/icons';

/**
 * A quantity with − and + on either side of a number field. Every change is kept between `min` and `max`, and
 * the button that would leave them is disabled. The field shows what the buyer types: a whole number is taken as it
 * is typed (one past `max` shows `max` at once), and a cleared or partial field waits for the next key, showing the
 * quantity again when the buyer leaves it — a cleared field never turns into `min` under the buyer's fingers (B-207).
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  label,
  className = '',
}: {
  value: number;
  /** A new quantity; `typed` when it came from the field rather than − or +. */
  onChange: (value: number, typed: boolean) => void;
  min?: number;
  /** The most that can be bought, when there is a limit. */
  max?: number;
  disabled?: boolean;
  /** Its name, when the page has more than one: "Quantity of <the product>" (B-434). "Quantity" by default. */
  label?: string;
  className?: string;
}) {
  const {t} = useTranslation();
  const name = label ?? t('quantity.label');
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (next: number) => Math.max(min, Math.min(max ?? Infinity, next));
  const step = 'grid h-full w-11 place-items-center disabled:cursor-not-allowed disabled:text-muted';

  return (
    <div
      role="group"
      aria-label={name}
      className={`inline-flex h-11 items-center rounded-input border border-control ${className}`}
    >
      <button
        type="button"
        aria-label={t('quantity.decrease')}
        className={step}
        disabled={disabled || value <= min}
        onClick={() => {
          setDraft(null);
          onChange(clamp(value - 1), false);
        }}
      >
        <MinusIcon className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={name}
        min={min}
        max={max}
        value={draft ?? value}
        disabled={disabled}
        onChange={(event) => {
          const typed = event.target.value;
          if (!/^\d+$/.test(typed)) return setDraft(typed);
          onChange(clamp(Number(typed)), true);
          // Past the limit there is nothing more to type: the field shows the limit at once.
          setDraft(max != null && Number(typed) > max ? null : typed);
        }}
        onBlur={() => setDraft(null)}
        className="h-full w-12 bg-transparent text-center text-field text-input md:text-body [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={t('quantity.increase')}
        className={step}
        disabled={disabled || (max != null && value >= max)}
        onClick={() => {
          setDraft(null);
          onChange(clamp(value + 1), false);
        }}
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}
