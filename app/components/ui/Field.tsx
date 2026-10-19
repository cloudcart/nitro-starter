import {type ComponentProps, type ReactNode, useId} from 'react';
import {useTranslation} from '@cloudcart/nitrogen';
import {ChevronDownIcon} from '~/components/ui/icons';

/**
 * The mark of a required field: an asterisk, hidden from screen readers, which read the control's own `required`.
 * `announce` also says "required" to them, for a heading whose controls do not carry it (a customization's).
 */
export function RequiredMark({announce = false}: {announce?: boolean}) {
  const {t} = useTranslation();
  return (
    <>
      <span aria-hidden="true" className="text-error">
        {' *'}
      </span>
      {announce && <span className="sr-only"> ({t('form.required')})</span>}
    </>
  );
}

/**
 * What every text control shares: the border, the typed text (16 px on a phone, so Safari on iOS does not zoom in), focus
 * and the invalid state; a pill for the footer's sign-up. The width is the caller's (a field in a column stretches to it).
 * Focus stays inside the box: its edge darkens and doubles (the border and a ring inside it), with no outline around it.
 */
export function controlClass({pill = false} = {}) {
  return `${pill ? 'rounded-full px-5' : 'rounded-input px-3'} border border-control bg-background text-field text-input md:text-body placeholder:text-muted hover:border-muted focus:border-foreground focus:ring-1 focus:ring-foreground focus:ring-inset focus-visible:outline-none aria-[invalid=true]:border-error disabled:cursor-not-allowed disabled:bg-surface`;
}

const CONTROL = controlClass();

/** A one-line text input. */
export function Input({className = '', ...props}: ComponentProps<'input'>) {
  return <input className={`h-11 ${CONTROL} ${className}`} {...props} />;
}

/**
 * A one-line input with a short text inside its frame, before or after what is typed — a currency's symbol or code,
 * a unit. The frame is a field's, and shows the focus of the input inside it as a field does, inside its box.
 */
export function AffixInput({
  leading,
  trailing,
  className = '',
  ...props
}: ComponentProps<'input'> & {leading?: ReactNode; trailing?: ReactNode}) {
  return (
    <span
      className={`flex h-11 items-center gap-2 ${CONTROL} focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground focus-within:ring-inset ${className}`}
    >
      {leading}
      <input className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted" {...props} />
      {trailing}
    </span>
  );
}

/** A multi-line text input. */
export function Textarea({className = '', rows = 4, ...props}: ComponentProps<'textarea'>) {
  return <textarea rows={rows} className={`py-2 ${CONTROL} ${className}`} {...props} />;
}

/**
 * A choice from a list: the browser's own select, with the icon set's arrow; `leading`, something shown before the
 * chosen value inside the box, such as its swatch.
 */
export function Select({
  className = '',
  leading,
  children,
  ...props
}: ComponentProps<'select'> & {leading?: ReactNode}) {
  return (
    <span className={`relative block ${className}`}>
      {leading && <span className="pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2">{leading}</span>}
      <select
        className={`h-11 w-full cursor-pointer appearance-none pr-10 ${leading ? 'pl-10' : ''} ${CONTROL}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
    </span>
  );
}

/**
 * A select drawn as its chosen option's text and an arrow, with no box (the listing's sort). The browser's own select
 * lies over them, see-through, so a click or a tap opens its list — a phone's own picker — and the keyboard works as on
 * any select. The text is 16 px on a phone, so Safari on iOS does not zoom in; the focus ring goes round the text.
 * With `phoneIcon`, a phone shows that icon in a 44 px square instead of the text and the arrow (T-566); the select is
 * still named by its label and read with its value.
 */
export function TextSelect({
  options,
  value,
  phoneIcon,
  className = '',
  ...props
}: Omit<ComponentProps<'select'>, 'value' | 'children'> & {
  /** The choices in order: the value sent and the text shown. */
  options: {value: string; label: string}[];
  value: string;
  /** What a phone shows in place of the text and the arrow. */
  phoneIcon?: ReactNode;
}) {
  const chosen = options.find((option) => option.value === value) ?? options[0];
  const text = phoneIcon ? 'max-md:hidden' : '';
  return (
    <span
      className={`relative inline-flex h-11 items-center gap-1 rounded-input text-field font-medium has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent md:text-body ${phoneIcon ? 'max-md:w-11 max-md:justify-center' : ''} ${className}`}
    >
      {phoneIcon && (
        <span aria-hidden="true" className="relative md:hidden">
          {phoneIcon}
        </span>
      )}
      <span aria-hidden="true" className={text}>
        {chosen?.label}
      </span>
      <ChevronDownIcon aria-hidden="true" className={`size-4 shrink-0 ${text}`} />
      <select value={value} className="absolute inset-0 cursor-pointer appearance-none opacity-0" {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}

/** The browser's own checkbox, in the foreground colour. */
export function Checkbox({className = '', ...props}: Omit<ComponentProps<'input'>, 'type'>) {
  return <input type="checkbox" className={`size-4 shrink-0 cursor-pointer accent-accent ${className}`} {...props} />;
}

/** The browser's own radio button, in the foreground colour. */
export function Radio({className = '', ...props}: Omit<ComponentProps<'input'>, 'type'>) {
  return <input type="radio" className={`size-4 shrink-0 cursor-pointer accent-accent ${className}`} {...props} />;
}

/** What a control needs to be named by its label and read with its errors. */
export type ControlA11y = {id: string; 'aria-describedby'?: string; 'aria-invalid'?: true};

/**
 * A control's label and errors. The label names the control; the errors are linked to it
 * (`aria-describedby`) and mark it invalid. A required field's `*` is for the eye: the control's
 * `required` says it to a screen reader.
 */
export function FieldShell({
  label,
  required,
  errors = [],
  id,
  className = '',
  children,
}: {
  label: ReactNode;
  required?: boolean;
  /** The messages about this control. */
  errors?: string[];
  /** The control's id, when the caller gives it one. */
  id?: string;
  className?: string;
  children: (a11y: ControlA11y) => ReactNode;
}) {
  const ownId = useId();
  const controlId = id ?? ownId;
  const errorId = `${controlId}-errors`;
  const invalid = errors.length > 0;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={controlId} className="font-medium">
        {label}
        {required && <RequiredMark />}
      </label>
      {children({id: controlId, ...(invalid && {'aria-describedby': errorId, 'aria-invalid': true})})}
      {invalid && (
        <p id={errorId} className="text-small text-error">
          {errors.map((error) => (
            <span key={error} className="block">
              {error}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
