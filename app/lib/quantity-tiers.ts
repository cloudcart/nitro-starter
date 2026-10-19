import type {MappedProductOptions} from '@cloudcart/nitrogen';
import {type CurrencyFormat, moneyWithFormat} from '@cloudcart/nitrogen-react';
import type {ProductFragment, ProductQuantityTierFragment} from 'storefrontapi.generated';
import {quantityWithin} from '~/lib/variants';

/** A card of the quantity tiers: a tier of the store's, or one piece at the variant's own price before the first. */
export type TierChoice = {
  min: number;
  max: number | null;
  tier: ProductQuantityTierFragment | null;
  /** The tier that saves the most, when more than one card is offered. */
  best: boolean;
};

type Variant = ProductFragment['selectedOrFirstAvailableVariant'];

/**
 * What the product form offers of the chosen variant's quantity tiers (T-544): each tier the buyer can buy (not above
 * the most there is, not below the least the variant is sold in) and, when the first starts above one piece and the
 * variant sells from one, one piece at its own price first. While another variant than the one the page loaded is on
 * its way, the loaded one's, which the form shows dimmed (`tiersPending`): the cards stay where they are until the
 * new figures come, and the page does not jump (the user, T-545). Where cards are offered the page shows no price of
 * its own. "The most there is" is `piecesMaximum`'s: with the variant chosen in the cards, every variant's (B-370).
 */
export function tierChoices(
  product: Pick<ProductFragment, 'selectedOrFirstAvailableVariant'>,
  options: MappedProductOptions[],
  chosen: Variant,
  variants: PieceVariant[] | null = null,
): TierChoice[] {
  const loaded = product.selectedOrFirstAvailableVariant;
  if (!loaded || !chosen) return [];
  const {minimum} = quantityWithin(chosen, 1);
  const maximum = piecesMaximum(options, chosen, variants);
  const tiers = loaded.quantityDiscounts.filter(
    (tier) => (maximum === undefined || tier.minQuantity <= maximum) && (tier.maxQuantity ?? Infinity) >= minimum,
  );
  if (!tiers.length) return [];
  const choices: TierChoice[] = tiers.map((tier) => ({
    min: tier.minQuantity,
    max: tier.maxQuantity ?? null,
    tier,
    best: false,
  }));
  if (minimum === 1 && choices[0].min > 1) choices.unshift({min: 1, max: choices[0].min - 1, tier: null, best: false});
  // The largest saving, the last of equals (the cheaper piece); worth a mark only beside another card.
  const best = choices.reduce<TierChoice | null>(
    (top, choice) => ((choice.tier?.percentOff ?? 0) >= (top?.tier?.percentOff ?? 1) ? choice : top),
    null,
  );
  if (best && choices.length > 1) best.best = true;
  return choices;
}

/**
 * The variants the buyer set for pieces 2… (T-545, T-549), in their places — one list for every card, each card
 * showing as many as it holds, so a choice stays whatever card is chosen; piece #1 is the page's variant.
 */
export type PieceChoice = (string | undefined)[];

/** Nothing set: every piece is the page's variant. */
export const NO_PIECES: PieceChoice = [];

/**
 * Whether the variant is chosen in the tier cards (T-547): the cards are shown — the variant is for sale and has
 * tiers the buyer can reach — and the product has more than one variant. The option buttons then give way to the
 * chosen card's selects.
 */
export function choosesInTiers(
  product: Pick<ProductFragment, 'selectedOrFirstAvailableVariant'>,
  options: MappedProductOptions[],
  chosen: Variant,
  variants: PieceVariant[] | null = null,
): boolean {
  return (
    Boolean(chosen?.availableForSale) &&
    options.some((option) => option.optionValues.length > 1) &&
    tierChoices(product, options, chosen, variants).length > 0
  );
}

/**
 * The most pieces the form offers (B-370). With more than one variant to choose from, pieces of several go past one's
 * stock: the stock of every variant for sale — none when one is not tracked, or before the variants are known (the
 * cards then stay, rather than appear when they come). Otherwise the variant's own.
 */
function piecesMaximum(
  options: MappedProductOptions[],
  chosen: Variant,
  variants: PieceVariant[] | null,
): number | undefined {
  if (!options.some((option) => option.optionValues.length > 1)) return quantityWithin(chosen, 1).maximum;
  if (!variants) return undefined;
  const forSale = variants.filter((variant) => variant.availableForSale);
  if (forSale.some((variant) => variant.quantityAvailable == null)) return undefined;
  return forSale.reduce((sum, variant) => sum + (variant.quantityAvailable ?? 0), 0);
}

/**
 * The form's quantity and its bounds (B-370): with the variant chosen in the cards, up to `piecesMaximum`; otherwise
 * the page's variant's.
 */
export function formQuantity(
  product: Pick<ProductFragment, 'selectedOrFirstAvailableVariant'>,
  options: MappedProductOptions[],
  chosen: Variant,
  quantity: number,
  variants: PieceVariant[] | null,
) {
  if (!chosen || !choosesInTiers(product, options, chosen, variants)) return quantityWithin(chosen, quantity);
  const maximum = piecesMaximum(options, chosen, variants) ?? null;
  return quantityWithin({minimumQuantity: chosen.minimumQuantity, quantityAvailable: maximum}, quantity);
}

/**
 * The first `count` pieces: #1 the page's variant, then those set. A piece not set is #1's while #1 has stock left for
 * it, then the variant the buyer can take closest to #1 (B-370) — known once the variants come.
 */
export function cardPieces(
  choice: PieceChoice,
  first: string,
  count: number,
  variants: PieceVariant[] | null = null,
): string[] {
  const ids = Array.from({length: count}, (_, index) => (index === 0 ? first : (choice[index - 1] ?? null)));
  const from = variants?.find((variant) => variant.id === first);
  const taken = (variantId: string) => ids.filter((id) => id === variantId).length;
  for (let index = 1; index < count; index++) {
    if (ids[index] !== null) continue;
    ids[index] =
      variants && from && !isFree(from, taken(first))
        ? (closestVariant(variants, from, (variant) => isFree(variant, taken(variant.id)))?.id ?? first)
        : first;
  }
  return ids as string[];
}

/**
 * The variant of each piece when the variant is chosen in the cards (`choosesInTiers`): as many as the quantity
 * (`cardPieces`). Null otherwise: every piece is the page's variant, one line.
 */
export function tierPieces(
  product: Pick<ProductFragment, 'selectedOrFirstAvailableVariant'>,
  options: MappedProductOptions[],
  chosen: Variant,
  quantity: number,
  choice: PieceChoice,
  variants: PieceVariant[] | null = null,
): string[] | null {
  if (!chosen || !choosesInTiers(product, options, chosen, variants)) return null;
  return cardPieces(choice, chosen.id, formQuantity(product, options, chosen, quantity, variants).amount, variants);
}

/** The choice with piece `index` (1 for #2…) set to a variant, the other pieces as they were. */
export function choosePiece(choice: PieceChoice, index: number, variantId: string): PieceChoice {
  const next = [...choice];
  next[index - 1] = variantId;
  return next;
}

/** The tier card a quantity falls in: the last tier for every quantity above it. */
export function chosenTier(choices: TierChoice[], quantity: number): TierChoice | undefined {
  return choices.find((choice) => quantity >= choice.min && quantity <= (choice.max ?? Infinity));
}

/**
 * Whether a card's pieces cost other than the card's own figures — the page's loaded variant's tier at its least: they
 * are of another variant, mix variants, or are more than the card's least.
 */
export function piecesNeedSum(ids: string[], least: number, loaded: string): boolean {
  return ids.length !== least || ids.some((id) => id !== loaded);
}

type Money = {amount: string; currencyCode: string};
type PricedVariant = {
  id: string;
  price: Money;
  quantityDiscounts: {minQuantity: number; price: Money; compareAtPrice?: Money | null}[];
};

/**
 * What a card's pieces cost in the cart, summed from the store's per-piece prices by the cart's rule (Q-58):
 * every piece of the product counts toward the tier, each at its own variant's highest tier the count reaches, below
 * the first at the variant's own price. The price before: a tier's (the variant's before its own discount), below the
 * first tier the variant's as the page shows it (`before`). The saving — a badge and "You save" — only when a piece
 * reached a tier: below every tier a card shows its price over the one before, as one piece's does. Written in the
 * store's money format; null until the variants and the format are known.
 */
export function piecesFigures<V extends PricedVariant>(
  ids: string[],
  variants: V[] | null,
  format: CurrencyFormat | null,
  before: (variant: V) => Money | null | undefined,
) {
  if (!variants || !format) return null;
  const cents = (money: Money) => Math.round(Number(money.amount) * 100);
  let total = 0;
  let regular = 0;
  let currency = '';
  let tiered = false;
  for (const id of ids) {
    const variant = variants.find((known) => known.id === id);
    if (!variant) return null;
    const tier = variant.quantityDiscounts.filter((reached) => reached.minQuantity <= ids.length).at(-1);
    const price = tier ? tier.price : variant.price;
    tiered ||= Boolean(tier);
    total += cents(price);
    regular += cents((tier ? tier.compareAtPrice : before(variant)) ?? price);
    currency = price.currencyCode;
  }
  const money = (amount: number) => moneyWithFormat(amount / 100, currency as never, format);
  const saves = regular > total;
  return {
    // A piece's price, as a tier gives it: the pieces' average when they cost differently.
    price: money(Math.round(total / ids.length)),
    totalPrice: money(total),
    compareAtTotalPrice: saves ? money(regular) : null,
    percentOff: saves && tiered ? Math.round(100 - (total / regular) * 100) || null : null,
    totalSaving: saves && tiered ? money(regular - total) : null,
  };
}

/** The pieces as cart lines: one a variant with how many pieces it has, in the order the variants first come. */
export function piecesByVariant(ids: string[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts];
}

/** Whether the tiers shown are another variant's, the one the page loaded, while `variantId`'s are on their way. */
export function tiersPending(product: Pick<ProductFragment, 'selectedOrFirstAvailableVariant'>, variantId?: string) {
  return Boolean(variantId && product.selectedOrFirstAvailableVariant?.id !== variantId);
}

type PieceVariant = {
  id: string;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  selectedOptions: {name: string; value: string}[];
};

/** Whether the buyer can take one more piece of a variant already in `taken` pieces: for sale, and stock left. */
function isFree(variant: PieceVariant, taken: number): boolean {
  return variant.availableForSale && (variant.quantityAvailable == null || taken < variant.quantityAvailable);
}

const valueOf = (variant: PieceVariant, name: string) => variant.selectedOptions.find((o) => o.name === name)?.value;

/** Of the variants `free` says the buyer can take, the one with the most of `from`'s values (but `ignore`'s); the first on a tie. */
function closestVariant<V extends PieceVariant>(
  variants: V[],
  from: PieceVariant,
  free: (variant: V) => boolean,
  ignore?: string,
): V | undefined {
  const kept = (variant: PieceVariant) =>
    from.selectedOptions.filter((o) => o.name !== ignore && valueOf(variant, o.name) === o.value).length;
  let best: V | undefined;
  for (const variant of variants) if (free(variant) && (!best || kept(variant) > kept(best))) best = variant;
  return best;
}

/**
 * The variant a piece takes when one of its options is set to `value`: of the variants with that value the buyer can
 * take — for sale, and not in as many other pieces (`taken`) as it has in stock — the one that keeps the most of the
 * piece's other choices. None when no such variant has the value.
 */
export function pieceVariant<V extends PieceVariant>(
  variants: V[],
  from: V,
  option: string,
  value: string,
  taken: (variantId: string) => number,
): V | undefined {
  return closestVariant(
    variants.filter((variant) => valueOf(variant, option) === value),
    from,
    (variant) => variant.id === from.id || isFree(variant, taken(variant.id)),
    option,
  );
}
