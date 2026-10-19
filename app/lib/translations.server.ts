import {loadTranslations} from '@cloudcart/nitrogen';

// Every language's texts. Only the store's language, over English, reaches the page, through the root loader.
const files = import.meta.glob('../locales/*.json', {import: 'default'});

/** The texts in the store's language (`localization.language.isoCode`); a key it lacks shows in English. */
export const getTranslations = (language: string) => loadTranslations({language, files});
