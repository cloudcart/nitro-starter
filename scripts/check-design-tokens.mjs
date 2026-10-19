// Fails when the app styles something outside the design tokens in `app/styles/app.css` (§6.1, §6.4):
// - a colour of Tailwind's palette or the old one (Tailwind drops an unknown class silently, so the page would just
//   lose it), or a colour written as a value;
// - a breakpoint other than the theme's `md` (750px) and `lg` (990px);
// - a font size other than the text tokens (`text-body`, `text-small`, `text-h1`…`text-h6`, the heading roles
//   `text-display`, `text-title`, `text-product`, `text-heading`, `text-subheading`, `text-card`), or one of them with its
//   line height changed (`text-small/6`); rich text's own sizes (`prose-sm`) — app.css sizes `prose` from the tokens;
// - a radius other than the radius tokens, `rounded-full` (pills) and `rounded-none`;
// - a weight other than the type's 400, 500 and 700 (`font-normal`, `font-medium`, `font-bold`);
// - a width of Tailwind's own scale (`max-w-md`, `w-xl`, a container query's `@xs:`), a letter spacing, a line height
//   or a blur of its own (`tracking-wide`, `leading-tight`, `backdrop-blur-sm`): app.css resets those scales, so each
//   names its role there (`max-w-reading`, `tracking-label`); `leading-none` is no leading at all, as `rounded-none`
//   is no radius (B-450);
// - a media query with a width written in the code (`(width < 750px)`): the breakpoints are app.css's, and the code
//   takes them from `app/lib/breakpoints.ts`, which this check holds to app.css (B-450);
// - a length written as a value (`min-w-[640px]`): it is a token in app.css, used by name or as `var(--…)`. The
//   whole viewport (`100vw`, `100dvh`) is not a size of the design, and ratios and proportions (`aspect-[3/4]`,
//   `grid-cols-[2fr_1fr]`) carry no length;
// - rich text (`prose`) in typography's own greys: it goes with `prose-tokens` (the tokens), `prose-inherit` (the
//   colour around it, a merchant's) or `prose-invert` (a dark background), all in app.css or typography's.
// Text a visitor reads is checked by ESLint (`starter/no-literal-text`).
import {readFileSync, readdirSync} from 'node:fs';
import {join, relative} from 'node:path';

const root = join(import.meta.dirname, '..');
const PALETTE = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'white',
  'black',
  // The starter's own colours before the tokens.
  'brand',
  'dark',
  'light',
];
const PROPERTY =
  '(?:bg|text|border(?:-[trblxy])?|ring-offset|ring|divide|outline|placeholder|fill|stroke|from|to|via|decoration|accent|caret|shadow)';
const RULES = [
  [
    'a colour outside the tokens',
    new RegExp(`(?<![\\w/-])${PROPERTY}-(?:${PALETTE.join('|')})(?:-\\d{2,3})?(?:/\\d+)?(?![\\w-])`, 'g'),
  ],
  ['a breakpoint other than md and lg', /(?<![\w-])(?:(?:max|min)-)?(?:sm|xl|2xl):|(?<![\w-])(?:max|min)-\[[^\]]*\]:/g],
  [
    'a font size outside the text tokens',
    /(?<![\w-])text-(?:xs|sm|base|lg|[2-9]?xl)(?![\w-])|(?<![\w-])text-(?:body|small|h[1-6])\/[\w.[\]-]+/g,
  ],
  // Tailwind's own shadows are reset (`--shadow-*: initial`): one of them would draw nothing (B-400).
  ['a shadow outside the shadow tokens', /(?<![\w-])(?:inset-)?shadow(?:-(?:2xs|xs|sm|md|lg|xl|2xl))?(?![\w-])/g],
  ['rich text in its own sizes', /(?<![\w:-])prose-(?:sm|base|lg|xl|2xl)(?![\w-])/g],
  [
    'a radius outside the radius tokens',
    /(?<![\w-])rounded(?:-(?:t|b|l|r|s|e|tl|tr|bl|br|ss|se|es|ee))?(?:-(?:xs|sm|md|lg|[2-4]?xl|\[[^\]]*\]))?(?![\w-])/g,
  ],
  [
    'a weight other than 400, 500 and 700',
    /(?<![\w-])font-(?:thin|extralight|light|semibold|extrabold|black|\[[^\]]*\])(?![\w-])/g,
  ],
  [
    "a width of Tailwind's own scale",
    /(?<![\w-])(?:@|(?:max-|min-)?w-|basis-)(?:3xs|2xs|xs|sm|md|lg|xl|[2-7]xl)(?=[\s"'`:]|$)/g,
  ],
  ["a letter spacing of Tailwind's own", /(?<![\w-])tracking-(?:tighter|tight|normal|wide|wider|widest)(?![\w-])/g],
  ["a line height of Tailwind's own", /(?<![\w-])leading-(?:tight|snug|normal|relaxed|loose|\d+)(?![\w-])/g],
  [
    "a blur of Tailwind's own",
    /(?<![\w.-])(?:backdrop-)?blur-(?:xs|sm|md|lg|xl|[23]xl)(?![\w-])|(?<![\w.-])backdrop-blur(?![\w-])/g,
  ],
  [
    'a colour written as a value',
    /-\[(?:#|rgba?\(|hsla?\(|oklch\(|oklab\(|color-mix\()[^\]]*\]|['"`]#[0-9a-fA-F]{3,8}['"`]/g,
  ],
];

// A bracketed value, and a length in it other than the whole viewport.
const BRACKETED = /(?<![\w-])[a-z][\w-]*-\[[^\]]+\]/g;
// Bounded by anything but a letter, a digit or a point: `_` stands for a space in a bracketed value, `-` is calc's.
const LENGTH =
  /(?<![a-zA-Z0-9.])(?!100(?:vw|vh|dvh|svh|lvh)(?![a-zA-Z0-9]))\d*\.?\d+(?:px|rem|em|ch|ex|vw|vh|dvh|svh|lvh)(?![a-zA-Z0-9])/;

// `prose` without its colours on the same class list.
const PROSE = /(?<![\w:-])prose(?![\w-])/;
const PROSE_COLOURS = /(?<![\w:-])prose-(?:tokens|inherit|invert)(?![\w-])/;

// The breakpoints, from app.css; the code's own copy of them (`matchMedia` cannot read a CSS variable on the server).
const css = readFileSync(join(root, 'app/styles/app.css'), 'utf8');
const breakpoints = [...css.matchAll(/--breakpoint-(\w+):\s*(\d+)px/g)].map(([, , px]) => Number(px));
const pageWidth = Number(/--container-page:\s*([\d.]+)rem/.exec(css)?.[1]) * 16;
const BREAKPOINTS_FILE = 'app/lib/breakpoints.ts';
const codeMd = Number(/BREAKPOINT_MD = (\d+)/.exec(readFileSync(join(root, BREAKPOINTS_FILE), 'utf8'))?.[1]);
const cssMd = Number(/--breakpoint-md:\s*(\d+)px/.exec(css)?.[1]);
// A media query in the code: the range syntax, which only `breakpoints.ts` writes, and a picture's `sizes`
// (`(min-width: 990px)`), whose widths are the breakpoints or the page's width.
const RANGE_QUERY = /\(\s*width\s*[<>]=?\s*\d+(?:\.\d+)?px\s*\)/g;
const SIZES_QUERY = /\((?:min|max)-width:\s*(\d+(?:\.\d+)?)px\)/g;

const files = readdirSync(join(root, 'app'), {recursive: true})
  .filter((file) => /\.(tsx?|jsx?)$/.test(file))
  .map((file) => join(root, 'app', file));

const found = [];
if (!codeMd || codeMd !== cssMd)
  found.push(`${BREAKPOINTS_FILE}: BREAKPOINT_MD ${codeMd} is not app.css's --breakpoint-md (${cssMd}px)`);
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    // A line that is only a comment holds no class: its words ("a shadow", "rounded") are prose.
    if (/^\s*(?:\/\/|\/\*|\*|\{\/\*)/.test(line)) return;
    for (const [what, pattern] of RULES) {
      for (const match of line.matchAll(pattern))
        found.push(`${relative(root, file)}:${index + 1}: ${match[0]} (${what})`);
    }
    for (const match of line.matchAll(BRACKETED)) {
      if (LENGTH.test(match[0]))
        found.push(
          `${relative(root, file)}:${index + 1}: ${match[0]} (a length written as a value: a token in app.css)`,
        );
    }
    if (PROSE.test(line) && !PROSE_COLOURS.test(line))
      found.push(`${relative(root, file)}:${index + 1}: prose (typography's greys: add prose-tokens or prose-inherit)`);
    if (relative(root, file) !== BREAKPOINTS_FILE) {
      for (const match of line.matchAll(RANGE_QUERY))
        found.push(
          `${relative(root, file)}:${index + 1}: ${match[0]} (a breakpoint written in the code: breakpoints.ts)`,
        );
    }
    for (const match of line.matchAll(SIZES_QUERY)) {
      const px = Number(match[1]);
      if (!breakpoints.includes(px) && px !== pageWidth)
        found.push(`${relative(root, file)}:${index + 1}: ${match[0]} (a width other than app.css's breakpoints)`);
    }
  });
}

if (found.length) {
  console.error(`Styles outside the design tokens in app/styles/app.css:\n${found.join('\n')}`);
  process.exit(1);
}
