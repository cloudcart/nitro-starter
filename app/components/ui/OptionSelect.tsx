import type {ComponentProps} from 'react';
import {Select} from '~/components/ui/Field';
import {type OptionSwatch, SwatchDot} from '~/components/ui/OptionValue';

/** An option select's width: at most 192 px, sharing a row with the others. A name over it takes the same. */
export const OPTION_SELECT_WIDTH = 'max-w-48 min-w-0 flex-1';

/**
 * A product option's values in the browser's own select, the chosen value's swatch in its box: a "select" option on the
 * product page and each piece of a tier card (B-379).
 */
export function OptionSelect({
  values,
  swatch,
  ...props
}: Omit<ComponentProps<typeof Select>, 'children' | 'leading' | 'className'> & {
  /** The values in order: the name sent, the text shown when it says more, and whether it can be chosen. */
  values: {name: string; label?: string; disabled?: boolean}[];
  /** The chosen value's colour or picture. */
  swatch?: OptionSwatch;
}) {
  return (
    <Select
      leading={swatch?.color || swatch?.image ? <SwatchDot swatch={swatch} px={16} className="size-4" /> : null}
      className={OPTION_SELECT_WIDTH}
      {...props}
    >
      {values.map((value) => (
        <option key={value.name} value={value.name} disabled={value.disabled}>
          {value.label ?? value.name}
        </option>
      ))}
    </Select>
  );
}
