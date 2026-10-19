/**
 * The arithmetic of a sideways swipe between pages (`SwipeablePage`): which way a drag goes, how fast the finger moved
 * at the end, whether its let-go opens the neighbour, and how the page finishes its slide from the finger's speed.
 * Positions are in CSS pixels, times in milliseconds, speeds in pixels a millisecond.
 */

/** How far a finger moves before its drag is read as across (the page follows it) or up and down (the browser's). */
export const DRAG_SLACK = 10;

/** A drag let go past a quarter of the screen opens the neighbour, unless the finger flicked back. */
export const SWIPE_SHARE = 0.25;

/** A flick opens the neighbour from a shorter drag: at least 30 px, the finger at 0.3 px/ms that way at the end. */
export const FLICK_DISTANCE = 30;
export const FLICK_SPEED = 0.3;

/** The finger's speed is read over its last 100 ms: a rest before the move does not slow a flick down. */
export const SPEED_WINDOW_MS = 100;

/** How long a slide takes at most (a let-go at rest), and at least (a fast flick). */
export const SLIDE_MS = 300;
const SLIDE_MIN_MS = 120;

/** Where a finger was across, and when. */
export type Sample = {x: number; t: number};

/** Which way a drag goes once past the slack — across if more across than up and down; undecided inside it. */
export function dragDirection(dx: number, dy: number): 'across' | 'along' | undefined {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_SLACK) return undefined;
  return Math.abs(dx) > Math.abs(dy) ? 'across' : 'along';
}

/**
 * Whether a move still inside the slack already leans across: 3 px or more, more across than up and down. Safari
 * starts its own scroll on the first wobble of a sideways drag over `touch-action: pan-y` (WebKit bug 232545), so the
 * browser's scroll is held from here, before the drag is decided; a tap's few pixels are not a drag yet.
 */
export function leansAcross(dx: number, dy: number): boolean {
  return Math.abs(dx) >= 3 && Math.abs(dx) > Math.abs(dy);
}

/** The finger's speed across over its last moments, signed (negative to the left); 0 when it had stopped. */
export function speedOf(samples: readonly Sample[]): number {
  const last = samples.at(-1);
  if (!last) return 0;
  const first = samples.find((sample) => last.t - sample.t <= SPEED_WINDOW_MS) ?? last;
  return last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
}

/**
 * Whether a drag let go `dx` across, the finger at `speed`, opens the neighbour that way: a flick that way past
 * `FLICK_DISTANCE`, or a drag past a quarter of `width` that the finger did not flick back.
 */
export function opensNeighbour(dx: number, speed: number, width: number): boolean {
  const way = Math.sign(dx);
  if (way === 0) return false;
  const towards = speed * way;
  if (Math.abs(dx) >= FLICK_DISTANCE && towards >= FLICK_SPEED) return true;
  return Math.abs(dx) >= width * SWIPE_SHARE && towards > -FLICK_SPEED;
}

/**
 * How a slide over `distance` finishes when it starts at the finger's `speed` that way: it slows to a stop in about the
 * time a steady slowing takes (twice the distance over the speed), 120–300 ms, and its easing starts at the finger's
 * speed, so the page does not stop under the finger and set off again. At rest it is the gallery's flight
 * (`cubic-bezier(0.2, 0, 0, 1)`, 300 ms).
 */
export function slideFinish(distance: number, speed: number): {duration: number; easing: string} {
  const towards = Math.max(speed, 0);
  if (distance <= 0) return {duration: SLIDE_MIN_MS, easing: 'linear'};
  const duration = Math.round(
    towards > 0 ? Math.min(SLIDE_MS, Math.max(SLIDE_MIN_MS, (2 * distance) / towards)) : SLIDE_MS,
  );
  // The easing's start slope is its first control point's y over x (0.2): the finger's speed in the slide's units.
  const slope = (towards * duration) / distance;
  const y1 = Math.min(1, 0.2 * slope);
  return {duration, easing: `cubic-bezier(0.2, ${Number(y1.toFixed(3))}, 0, 1)`};
}
