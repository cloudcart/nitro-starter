import {useFormAction, useNavigation} from 'react-router';
import type {FormError} from '~/components/FormFields';

/** The form error an action returns when the API refused a whole mutation: `FormStatus` says it in the store's words. */
export const API_ERROR: FormError = {field: null, message: '', code: 'API_ERROR'};

/**
 * A mutation's payload, or null when the API refused the whole operation — a variable it could not take, say — and
 * answered with `errors` instead (B-202). Their messages are a developer's: logged on the server, never shown.
 */
export function payloadOf<T, K extends keyof T>(
  result: T & {errors?: ReadonlyArray<{message: string}> | null},
  key: K,
): NonNullable<T[K]> | null {
  const payload = result[key];
  if (payload != null) return payload;
  console.error(`${String(key)}: ${(result.errors ?? []).map((error) => error.message).join(', ') || 'no payload'}`);
  return null;
}

/** GraphQL's `Int` is a signed 32-bit integer. */
const INT_MAX = 2 ** 31 - 1;

/**
 * The whole number a form field or a search parameter holds, for an `Int` variable, or undefined for anything else —
 * "1.5", "abc", an empty field or a number `Int` cannot hold — which the API would refuse as a whole (B-202).
 */
export function integerOf(value: FormDataEntryValue | string | null | undefined): number | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!/^-?\d+$/.test(text)) return undefined;
  const number = Number(text);
  return Math.abs(number) <= INT_MAX ? number : undefined;
}

/**
 * A form's text fields, trimmed (B-204): `text` gives '' for a missing or blank one — for an input the API takes as
 * text, where blank clears it — and `optional` gives undefined — for an input the API reads as "not given".
 */
export function formFields(form: FormData) {
  const text = (name: string) => String(form.get(name) ?? '').trim();
  return {text, optional: (name: string) => text(name) || undefined};
}

/**
 * What a form of this page is sending, while it is on its way — the post, then the page it brings — for the loader on
 * the button that sent it; null otherwise. The route's own `<Form method="post">` by default, or the form that posts
 * to `action`. A link followed meanwhile, or a form posting elsewhere, is not it. Read the pressed button's
 * `name`/`value` from it (`get('intent')`) where a form has more than one.
 */
export function useSubmission(action?: string): FormData | null {
  const navigation = useNavigation();
  const formAction = useFormAction(action);
  return navigation.state !== 'idle' && navigation.formAction === formAction ? (navigation.formData ?? null) : null;
}
