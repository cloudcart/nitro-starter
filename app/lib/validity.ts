import type {Translate} from '@cloudcart/nitrogen';
import type {ValidatedControl, ValidityReason} from '@cloudcart/nitrogen-react';

/**
 * The store's words for a value the browser will not send, by its reason (B-454): `useValidityMessages` shows them in
 * place of the browser's, which are in the browser's language.
 */
export function validityMessage(reason: ValidityReason, control: ValidatedControl, t: Translate): string {
  const input = control instanceof HTMLInputElement ? control : null;
  switch (reason) {
    case 'valueMissing':
      if (control instanceof HTMLSelectElement || input?.type === 'radio') return t('form.invalid.choose');
      if (input?.type === 'checkbox') return t('form.invalid.check');
      if (input?.type === 'file') return t('form.invalid.file');
      return t('form.invalid.fill');
    case 'typeMismatch':
      return input?.type === 'url' ? t('form.invalid.url') : t('form.invalid.email');
    case 'badInput':
      return t('form.invalid.number');
    case 'rangeUnderflow':
      return t('form.invalid.min', {min: input?.min ?? ''});
    case 'rangeOverflow':
      return t('form.invalid.max', {max: input?.max ?? ''});
    case 'stepMismatch':
      return t('form.invalid.step', {step: input?.step ?? ''});
    case 'tooLong':
      return t('form.invalid.tooLong', {maxLength: 'maxLength' in control ? control.maxLength : ''});
    case 'tooShort':
      return t('form.invalid.tooShort', {minLength: 'minLength' in control ? control.minLength : ''});
    case 'patternMismatch':
      return t('form.invalid.pattern');
  }
}
