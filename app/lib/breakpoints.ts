/**
 * The theme's main breakpoint (app.css `--breakpoint-md`) for code that asks the browser about the screen
 * (`matchMedia`), which cannot read a CSS variable on the server. `scripts/check-design-tokens.mjs` holds it to app.css
 * (B-450).
 */
export const BREAKPOINT_MD = 750;

/** A screen below the main breakpoint: a phone. */
export const BELOW_MD = `(width < ${BREAKPOINT_MD}px)`;
