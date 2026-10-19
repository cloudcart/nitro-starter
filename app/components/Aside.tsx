import {createContext, type ReactNode, use, useState} from 'react';
import {Dialog} from '~/components/Dialog';

type AsideType = 'search' | 'cart' | 'mobile' | 'filters' | 'closed';
type AsideContextValue = {
  type: AsideType;
  open: (mode: AsideType) => void;
  close: () => void;
};

/**
 * A drawer along one side of the page — the cart, the mobile menu and the listing filters open in one — and only one
 * of them, or the search, is open at a time: the search opens through the same `open('search')` into a box near the
 * top of the screen (`Dialog` with `variant="float"`, `PageLayout`'s `SearchModal`), not a drawer (B-404).
 * @example
 * ```jsx
 * <Aside type="filters" heading={t('filters.title')} side="left">
 *   <FilterPanel filters={filters} totalCount={totalCount} />
 * </Aside>
 * ```
 */
export function Aside({
  children,
  heading,
  type,
  side = 'right',
}: {
  children?: ReactNode;
  type: AsideType;
  heading: ReactNode;
  side?: 'left' | 'right';
}) {
  const {type: activeType, close} = useAside();

  return (
    <Dialog variant="drawer" side={side} open={type === activeType} onClose={close} heading={heading}>
      {children}
    </Dialog>
  );
}

const AsideContext = createContext<AsideContextValue | null>(null);

Aside.Provider = function AsideProvider({children}: {children: ReactNode}) {
  const [type, setType] = useState<AsideType>('closed');

  return (
    <AsideContext
      value={{
        type,
        open: setType,
        close: () => setType('closed'),
      }}
    >
      {children}
    </AsideContext>
  );
};

export function useAside() {
  const aside = use(AsideContext);
  if (!aside) {
    throw new Error('useAside must be used within an AsideProvider');
  }
  return aside;
}
