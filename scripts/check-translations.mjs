// Fails when a translation in `app/locales/` is out of step with `en.json`, the complete default (§6.2): a text
// missing or not in English, a text whose `{placeholders}` differ from the English one, a text that depends on a
// count in one file and not in the other, or a count-dependent text without a form its language needs.
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const dir = join(import.meta.dirname, '..', 'app', 'locales');
const PLURAL_FORMS = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

/** A count-dependent text: its forms, `other` among them, as Nitrogen's `t()` reads it. */
const isPlural = (value) =>
  typeof value === 'object' &&
  typeof value.other === 'string' &&
  Object.entries(value).every(([form, text]) => PLURAL_FORMS.has(form) && typeof text === 'string');

/** Every text by its key; a count-dependent text is one entry. */
function texts(messages, prefix = '', found = new Map()) {
  for (const [key, value] of Object.entries(messages)) {
    if (typeof value === 'string' || isPlural(value)) found.set(prefix + key, value);
    else texts(value, `${prefix}${key}.`, found);
  }
  return found;
}

const placeholders = (value) =>
  [
    ...new Set(
      [...(typeof value === 'string' ? value : Object.values(value).join(' ')).matchAll(/\{(\w+)\}/g)].map(
        (match) => match[1],
      ),
    ),
  ]
    .sort()
    .join(', ');
const read = (file) => JSON.parse(readFileSync(join(dir, file), 'utf8'));

const english = texts(read('en.json'));
const found = [];
for (const file of readdirSync(dir)
  .filter((name) => name.endsWith('.json'))
  .sort()) {
  const translation = file === 'en.json' ? english : texts(read(file));
  const forms = new Intl.PluralRules(file.replace(/\.json$/, '')).resolvedOptions().pluralCategories;

  for (const [key, value] of translation) {
    const base = english.get(key);
    if (base === undefined) found.push(`${file}: ${key} is not in en.json`);
    else if (isPlural(base) !== isPlural(value))
      found.push(`${file}: ${key} ${isPlural(base) ? 'needs' : 'has no'} forms by count, as in en.json`);
    else if (placeholders(base) !== placeholders(value))
      found.push(`${file}: ${key} uses {${placeholders(value)}}, en.json {${placeholders(base)}}`);
    if (isPlural(value))
      for (const form of forms) if (!(form in value)) found.push(`${file}: ${key} lacks the "${form}" form`);
  }
  for (const key of english.keys()) if (!translation.has(key)) found.push(`${file}: ${key} is missing`);
}

if (found.length) {
  console.error(`Translations out of step with app/locales/en.json:\n${found.join('\n')}`);
  process.exit(1);
}
