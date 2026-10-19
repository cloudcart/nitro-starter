import type {ComponentType, SVGProps} from 'react';
import {
  AdjustmentsHorizontalIcon,
  Bars3Icon,
  BarsArrowDownIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon as ChevronDownSvg,
  ChevronLeftIcon as ChevronLeftSvg,
  ChevronRightIcon as ChevronRightSvg,
  EllipsisHorizontalIcon,
  HeartIcon as HeartSvg,
  MagnifyingGlassIcon,
  MinusIcon as MinusSvg,
  PhotoIcon,
  PauseIcon as PauseSvg,
  PlayIcon as PlaySvg,
  PlusIcon as PlusSvg,
  TagIcon as TagSvg,
  TrashIcon as TrashSvg,
  ScaleIcon,
  ShoppingBagIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {HeartIcon as HeartFilledSvg, StarIcon as StarSvg} from '@heroicons/react/24/solid';

/*
 * The storefront's icons, named for what they mean. They are drawn from Heroicons (MIT): outlined, with the
 * filled heart and star where filled means "chosen". Change the set here; nothing else imports an icon library.
 */

type Svg = ComponentType<SVGProps<SVGSVGElement>>;

/** An icon's props: an SVG's, sized by `className` (`size-5` when none is given). */
export type IconProps = SVGProps<SVGSVGElement>;

/** Decorative by default: the button or link around it carries the name. Pass `aria-hidden={false}` and a `<title>` to give one. */
function Icon({svg: Glyph, className = 'size-5', ...props}: IconProps & {svg: Svg}) {
  return <Glyph aria-hidden="true" focusable="false" className={className} {...props} />;
}

export const AccountIcon = (props: IconProps) => <Icon svg={UserIcon} {...props} />;
export const CartIcon = (props: IconProps) => <Icon svg={ShoppingBagIcon} {...props} />;
export const ChevronDownIcon = (props: IconProps) => <Icon svg={ChevronDownSvg} {...props} />;
export const ChevronLeftIcon = (props: IconProps) => <Icon svg={ChevronLeftSvg} {...props} />;
export const ChevronRightIcon = (props: IconProps) => <Icon svg={ChevronRightSvg} {...props} />;
export const CloseIcon = (props: IconProps) => <Icon svg={XMarkIcon} {...props} />;
export const CompareIcon = (props: IconProps) => <Icon svg={ScaleIcon} {...props} />;
export const FilterIcon = (props: IconProps) => <Icon svg={AdjustmentsHorizontalIcon} {...props} />;
export const HeartIcon = (props: IconProps) => <Icon svg={HeartSvg} {...props} />;
export const HeartFilledIcon = (props: IconProps) => <Icon svg={HeartFilledSvg} {...props} />;
export const ImageIcon = (props: IconProps) => <Icon svg={PhotoIcon} {...props} />;
export const MoreIcon = (props: IconProps) => <Icon svg={EllipsisHorizontalIcon} {...props} />;
export const MenuIcon = (props: IconProps) => <Icon svg={Bars3Icon} {...props} />;
export const MinusIcon = (props: IconProps) => <Icon svg={MinusSvg} {...props} />;
export const PauseIcon = (props: IconProps) => <Icon svg={PauseSvg} {...props} />;
export const PlayIcon = (props: IconProps) => <Icon svg={PlaySvg} {...props} />;
export const PlusIcon = (props: IconProps) => <Icon svg={PlusSvg} {...props} />;
export const RemoveIcon = (props: IconProps) => <Icon svg={TrashSvg} {...props} />;
export const ReviewsIcon = (props: IconProps) => <Icon svg={ChatBubbleLeftRightIcon} {...props} />;
export const SearchIcon = (props: IconProps) => <Icon svg={MagnifyingGlassIcon} {...props} />;
export const SortIcon = (props: IconProps) => <Icon svg={BarsArrowDownIcon} {...props} />;
export const DiscountIcon = (props: IconProps) => <Icon svg={TagSvg} {...props} />;

/** A grid's columns, drawn as `count` bars: the listing's density buttons. */
export function ColumnsIcon({count, className = 'size-5', ...props}: IconProps & {count: number}) {
  const gap = 2;
  const width = (20 - gap * (count - 1)) / count;
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className} {...props}>
      {Array.from({length: count}, (_, index) => (
        <rect key={index} x={index * (width + gap)} y="2" width={width} height="16" rx="1" />
      ))}
    </svg>
  );
}
export const StarIcon = (props: IconProps) => <Icon svg={StarSvg} {...props} />;
