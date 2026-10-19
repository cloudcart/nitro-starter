import type {ComponentProps, ReactNode} from 'react';
import {useTranslation} from '@cloudcart/nitrogen';
import type {FormPolicyFragment} from 'storefrontapi.generated';
import type {PolicyForm} from '@cloudcart/nitrogen/storefront-api-types';
import type {OrderConsent} from '~/lib/fragments';
import {Checkbox, FieldShell, Input, Radio, RequiredMark, Select, Textarea} from '~/components/ui/Field';
import {pagePath} from '~/lib/urls';

/** An error the API returned for a form, as `FormUserError` and `CustomerUserError` have it. */
export type FormError = {field?: string[] | null; message: string; code?: string | null};

/** The errors about one input (`field` ending in its name), or about the whole form (`field` null). */
export function errorsFor(errors: FormError[] | undefined, name?: string) {
  return (errors ?? []).filter((error) =>
    name ? error.field?.[error.field.length - 1] === name : !error.field?.length,
  );
}

/** The messages of the errors about one input. */
function messagesFor(errors: FormError[] | undefined, name: string) {
  return errorsFor(errors, name).map((error) => error.message);
}

/** A labelled input with its errors. */
export function Field({
  label,
  name,
  errors,
  required,
  className,
  id,
  ...props
}: {label: string; name: string; errors?: FormError[]} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} required={required} errors={messagesFor(errors, name)} id={id} className={className}>
      {(a11y) => <Input name={name} required={required} {...a11y} {...props} />}
    </FieldShell>
  );
}

/** A labelled choice from a fixed list, with its errors. */
export function SelectField({
  label,
  name,
  options,
  errors,
  required,
  placeholder,
  className,
  id,
  ...props
}: {
  label: string;
  name: string;
  options: Array<{value: string; label: string}>;
  errors?: FormError[];
  placeholder?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} required={required} errors={messagesFor(errors, name)} id={id} className={className}>
      {(a11y) => (
        <Select name={name} required={required} {...a11y} {...props}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      )}
    </FieldShell>
  );
}

/** A labelled text area with its errors. */
export function TextArea({
  label,
  name,
  errors,
  required,
  className,
  id,
  ...props
}: {label: string; name: string; errors?: FormError[]} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} required={required} errors={messagesFor(errors, name)} id={id} className={className}>
      {(a11y) => <Textarea name={name} required={required} {...a11y} {...props} />}
    </FieldShell>
  );
}

/** A checkbox with its label beside it; the label may hold links. */
export function CheckboxField({label, ...props}: {label: ReactNode} & Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <label className="flex items-start gap-2">
      <Checkbox className="mt-0.5" {...props} />
      <span>{label}</span>
    </label>
  );
}

/** A radio button with its label beside it. */
export function RadioField({label, ...props}: {label: ReactNode} & Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <label className="flex items-start gap-2">
      <Radio className="mt-0.5" {...props} />
      <span>{label}</span>
    </label>
  );
}

/**
 * The policies the visitor accepts with a form — one checkbox each, sent as
 * `acceptedPolicyIds`. A policy the merchant made required for this form must
 * be ticked; the API refuses the form otherwise.
 */
export function PolicyCheckboxes({
  policies,
  form,
  errors,
}: {
  policies: FormPolicyFragment[];
  form: PolicyForm;
  errors?: FormError[];
}) {
  return (
    <AcceptCheckboxes
      name="acceptedPolicyIds"
      items={policies.map((policy) => ({
        id: policy.id,
        title: policy.page.title,
        handle: policy.page.handle,
        required: policy.forms.some((entry) => entry.form === form && entry.required),
      }))}
      errors={errors}
    />
  );
}

/**
 * The consents an order asks for (`orderConsents()`), one checkbox each, sent
 * as `acceptedConsentIds`. The API refuses the order without the required ones.
 */
export function ConsentCheckboxes({consents, errors}: {consents: OrderConsent[]; errors?: FormError[]}) {
  return <AcceptCheckboxes name="acceptedConsentIds" items={consents} errors={errors} />;
}

/**
 * "I accept the <page>" for each item, its page opening in a new tab, with the errors about the list (B-204) — those
 * shown even when the list the page has is empty, as when the store added a policy since it was read (B-424).
 */
function AcceptCheckboxes({name, items, errors}: {name: string; items: OrderConsent[]; errors?: FormError[]}) {
  const {t} = useTranslation();
  const own = errorsFor(errors, name);
  if (!items.length && !own.length) return null;

  return (
    <fieldset className="flex flex-col gap-2">
      {/* The group's name, for a screen reader: each box reads as one of the terms to accept (B-434). */}
      <legend className="sr-only">{t('form.terms')}</legend>
      {items.map((item) => (
        <CheckboxField
          key={item.id}
          name={name}
          value={item.id}
          required={item.required}
          label={
            <>
              {t('form.accept')}{' '}
              {item.handle ? (
                <a href={pagePath(item.handle)} target="_blank" rel="noreferrer" className="inline-link">
                  {item.title}
                </a>
              ) : (
                item.title
              )}
              {item.required && <RequiredMark />}
            </>
          }
        />
      ))}
      {own.map((error) => (
        <span key={error.message} className="text-small text-error">
          {error.message}
        </span>
      ))}
    </fieldset>
  );
}

/**
 * A form's outcome: its message alone, or its errors with `fields`, the names of the inputs it shows beside which
 * their own errors appear.
 */
type FormStatusProps = {message?: string | null} & (
  {errors?: undefined; fields?: undefined} | {errors: FormError[] | undefined; fields: readonly string[]}
);

/**
 * The outcome of a sent form: the API's message, or the errors the form cannot show beside an input — about the whole
 * form, or about an input it does not render (`input` itself, a hidden input) — one without a message (the API
 * refused the whole form, `API_ERROR`) in the store's words. An error is never dropped (B-424).
 */
export function FormStatus({message, errors, fields}: FormStatusProps) {
  const {t} = useTranslation();
  const general = (errors ?? []).filter((error) => !error.field?.length || !fields?.includes(error.field.at(-1)!));
  if (!message && !general.length) return null;

  return (
    <div
      role="status"
      className={`rounded-card p-3 ${general.length ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}
    >
      {general.length
        ? general.map((error) => <p key={error.code ?? error.message}>{error.message || t('form.error')}</p>)
        : message}
    </div>
  );
}

/** The browser's user agent, sent with forms so the store records the consent with it. */
export function buyerUserAgent(request: Request) {
  return request.headers.get('user-agent') ?? undefined;
}
