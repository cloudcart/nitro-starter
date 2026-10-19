import {useId} from 'react';
import {type MappedProductOptions, useTranslation} from '@cloudcart/nitrogen';
import {Money} from '@cloudcart/nitrogen-react';
import type {ProductVariantFragment} from 'storefrontapi.generated';
import {Badge} from '~/components/ui/Badge';
import {OPTION_SELECT_WIDTH, OptionSelect} from '~/components/ui/OptionSelect';
import {chosenTier, pieceVariant, type piecesFigures, type TierChoice} from '~/lib/quantity-tiers';

export type PieceVariant = Pick<
  ProductVariantFragment,
  | 'id'
  | 'title'
  | 'availableForSale'
  | 'quantityAvailable'
  | 'minimumQuantity'
  | 'selectedOptions'
  | 'image'
  | 'mediaIds'
  | 'product'
>;
type PiecesFigures = NonNullable<ReturnType<typeof piecesFigures>>;

/** The variant of each piece, chosen in the cards (T-545, T-547, T-548). */
export type TierPieces = {
  /** The chosen card's pieces. */
  ids: string[];
  /** Another card's pieces at its least: what it holds while closed. */
  piecesOf: (card: number) => string[];
  /** The product's options: a select each, its values with their swatches. */
  options: MappedProductOptions[];
  /** The page's variant: the one known before the product's variants load. */
  current: PieceVariant;
  variants: PieceVariant[] | null;
  /** What a card's pieces cost when its own figures are not the answer (summed, Q-58); null when they are. */
  figuresOf: (ids: string[], least: number) => PiecesFigures | null;
  onChange: (index: number, variant: PieceVariant) => void;
};

/**
 * The chosen variant's quantity tiers as one choice (T-544; `tierChoices` says which), under a heading between two
 * rules: a card each — "Buy 2", its saving as a badge and in money ("You save €14.00"), and on the right the price of
 * its pieces at the size of the product's price over the price before it; the largest saving tagged "Best value".
 * Choosing a card sets the quantity to its least; the quantity chooses the card it falls in, the last tier for every
 * quantity above it, as the cart charges. Every figure is the store's (`ProductVariant.quantityDiscounts`); the page
 * shows no price of its own beside them.
 *
 * With `pieces` the variant is chosen here (T-547, T-549): each card holds the options' selects for its own pieces —
 * one piece's, or a numbered row a piece — shown in the chosen card, which opens and closes by its height, linearly
 * (the user); a piece added slides in. A card's figures are then what its pieces cost in the cart, summed from the
 * store's per-piece prices (Q-58) when its own are not the answer — at once, no request. While another variant is on
 * its way and a card shows the loaded one's figures, the chosen card's shimmer, as the cart's do (B-367, B-368).
 */
export function QuantityTiers({
  choices,
  variant,
  quantity,
  minimum,
  onChange,
  pending = false,
  pieces,
}: {
  choices: TierChoice[];
  /** The variant's price and the one before its own discount, as the page would show them: one piece's card. */
  variant: {price: ProductVariantFragment['price']; compareAtPrice: ProductVariantFragment['compareAtPrice']};
  quantity: number;
  /** The least the variant is sold in. */
  minimum: number;
  onChange: (quantity: number) => void;
  /** Another variant is on its way: the figures shown are the one before's. */
  pending?: boolean;
  pieces?: TierPieces | null;
}) {
  const {t} = useTranslation();
  const groupId = useId();
  const chosen = chosenTier(choices, quantity);
  const open = pieces ? chosen?.min : undefined;
  if (!choices.length) return null;

  return (
    <fieldset className="flex flex-col gap-3" aria-busy={pending || undefined}>
      <legend className="mb-3 flex w-full items-center gap-4 text-small font-bold uppercase before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        {t('product.tiers.title')}
      </legend>
      {choices.map((choice) => {
        const isOpen = choice.min === open;
        // Its own pieces: the chosen card's; another's at its least, as choosing it gives them.
        const ids = pieces && (isOpen ? pieces.ids : pieces.piecesOf(choice.min));
        // Its pieces' sum when the card's own figures are not the answer.
        const own = pieces && ids ? pieces.figuresOf(ids, choice.min) : null;
        const figures = own || choice.tier;
        const total = figures ? figures.totalPrice : variant.price;
        const before = figures ? figures.compareAtTotalPrice : variant.compareAtPrice;
        // The loaded variant's figures while another is on its way: the chosen card's shimmer (B-368); a sum does not.
        const busy = pending && !own && (!pieces || isOpen);
        const sweep = busy ? 'shimmer' : '';
        // A piece's price where the card holds more than one.
        const perPiece = (ids?.length ?? choice.min) > 1 ? figures?.price : null;
        // The chosen look follows the card's radio, not any `:checked` in it: its selects hold a chosen option (B-372).
        return (
          <div
            key={choice.min}
            data-tier
            className="relative rounded-card border border-border bg-background transition-colors hover:border-control has-[input[type=radio]:checked]:border-accent has-[input[type=radio]:checked]:bg-surface has-[input[type=radio]:checked]:ring-1 has-[input[type=radio]:checked]:ring-accent has-[input[type=radio]:checked]:ring-inset has-[input[type=radio]:focus-visible]:outline-2 has-[input[type=radio]:focus-visible]:outline-offset-2 has-[input[type=radio]:focus-visible]:outline-accent"
          >
            {choice.best && (
              <Badge variant="accent" size="small" className="absolute -top-2.5 right-4 uppercase">
                {t('product.tiers.best')}
              </Badge>
            )}
            <label className="flex cursor-pointer items-center gap-3 p-4">
              <input
                type="radio"
                name={groupId}
                value={choice.min}
                checked={choice === chosen}
                onChange={() => onChange(Math.max(choice.min, minimum))}
                className="peer sr-only"
              />
              {/* The radio's look: a ring, filled in the accent while chosen. */}
              <span
                aria-hidden="true"
                className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-control peer-checked:border-accent peer-checked:after:size-2.5 peer-checked:after:rounded-full peer-checked:after:bg-accent"
              />
              <span className="@container flex min-w-0 flex-1 flex-col gap-1" aria-busy={busy || undefined}>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-bold">
                    {choice.max === null
                      ? t('product.tiers.buyOrMore', {count: choice.min})
                      : choice.max > choice.min
                        ? t('product.tiers.buyRange', {min: choice.min, max: choice.max})
                        : t('product.tiers.buy', {count: choice.min})}
                  </span>
                  {figures?.percentOff && (
                    <Badge variant="saving">
                      <span className={sweep}>{t('product.discountBadge', {percent: figures.percentOff})}</span>
                    </Badge>
                  )}
                </span>
                {/* A piece's price, then the saving (the user, T-549): on one line where both fit, else one each (B-375) — each
                    its own box, since the hidden dot leaves none between two bare texts. */}
                {(perPiece || figures?.totalSaving) && (
                  <span
                    className={`flex w-fit flex-col text-small text-muted @tier-line:flex-row @tier-line:gap-1 ${sweep}`}
                  >
                    {perPiece && (
                      <Money data={perPiece}>{(price) => <span>{t('product.tiers.perPiece', {price})}</span>}</Money>
                    )}
                    {perPiece && figures?.totalSaving && (
                      // The separator's mark alone: the row's gap is its space.
                      <span aria-hidden="true" className="hidden @tier-line:inline">
                        {t('format.separator').trim()}
                      </span>
                    )}
                    {figures?.totalSaving && (
                      <Money data={figures.totalSaving}>
                        {(amount) => <span>{t('product.tiers.saving', {amount})}</span>}
                      </Money>
                    )}
                  </span>
                )}
              </span>
              {/* The price, as large as the product's own, over the price before it. */}
              <span className="flex shrink-0 flex-col items-end" aria-busy={busy || undefined}>
                <Money data={total} className={`text-h4 ${sweep}`} />
                {before && parseFloat(before.amount) > parseFloat(total.amount) && (
                  <Money data={before} as="s" className={`text-small text-muted ${sweep}`} />
                )}
              </span>
            </label>
            {pieces && ids && ids.length > 1 && (
              <div
                data-open={isOpen || undefined}
                className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-linear data-open:grid-rows-[1fr]"
              >
                <div className="min-h-0 overflow-hidden" inert={!isOpen || undefined}>
                  <PieceRows pieces={{...pieces, ids}} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}

/**
 * The options' names, then the options' selects, the value's swatch in the box: one piece's alone, more pieces' as a
 * numbered row each, a row added sliding in.
 */
function PieceRows({pieces}: {pieces: TierPieces}) {
  const {t} = useTranslation();
  const known = pieces.variants ?? [pieces.current];
  const variantOf = (id: string) => known.find((variant) => variant.id === id) ?? pieces.current;
  const numbered = pieces.ids.length > 1;
  return (
    <div className="flex flex-col gap-2 px-4 pb-2">
      {/* The options' names over their selects; each select is named for a screen reader. */}
      <div aria-hidden="true" className="flex gap-3 text-small text-muted">
        {numbered && <span className="w-6 shrink-0" />}
        {pieces.options.map((option) => (
          <span key={option.name} className={OPTION_SELECT_WIDTH}>
            {option.name}
          </span>
        ))}
      </div>
      <ol className="flex flex-col" aria-label={t('product.tiers.pieces')}>
        {pieces.ids.map((id, index) => {
          const piece = variantOf(id);
          // The other pieces of a variant: it is not offered past its stock.
          const taken = (variantId: string) =>
            pieces.ids.filter((other, at) => at !== index && other === variantId).length;
          return (
            <li
              // eslint-disable-next-line @eslint-react/no-array-index-key -- the rows are the pieces in order: a row is its place
              key={index}
              className="grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-200 ease-linear starting:grid-rows-[0fr] starting:opacity-0"
            >
              <div className="flex min-h-0 items-center gap-3 overflow-hidden pb-2">
                {numbered && (
                  <span aria-hidden="true" className="w-6 shrink-0 text-small text-muted">
                    #{index + 1}
                  </span>
                )}
                {pieces.options.map((option) => {
                  const value = piece.selectedOptions.find((o) => o.name === option.name)?.value ?? '';
                  return (
                    <OptionSelect
                      key={option.name}
                      aria-label={
                        numbered ? t('product.tiers.piece', {number: index + 1, option: option.name}) : option.name
                      }
                      value={value}
                      swatch={option.optionValues.find((v) => v.name === value)?.swatch}
                      values={option.optionValues.map((optionValue) => ({
                        name: optionValue.name,
                        disabled:
                          optionValue.name !== value &&
                          !pieceVariant(known, piece, option.name, optionValue.name, taken),
                      }))}
                      onChange={(event) => {
                        const next = pieceVariant(known, piece, option.name, event.target.value, taken);
                        if (next) pieces.onChange(index, next);
                      }}
                    />
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
