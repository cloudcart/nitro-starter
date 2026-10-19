import type en from '~/locales/en.json';

// Every `t()` key is checked against the English texts, which are always complete: a missing key is a type error.
type DefaultMessages = typeof en;

declare global {
  interface NitrogenTranslations extends DefaultMessages {}
}
