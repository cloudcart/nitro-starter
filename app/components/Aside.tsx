import {createContext, useContext, useState, useEffect, useId, type ReactNode} from 'react';

type AsideType = 'cart' | 'search' | 'mobile' | 'closed';

interface AsideContextValue {
  type: AsideType;
  open: (type: AsideType) => void;
  close: () => void;
}

const AsideContext = createContext<AsideContextValue>({
  type: 'closed',
  open: () => {},
  close: () => {},
});

export function useAside() {
  return useContext(AsideContext);
}

export function AsideProvider({children}: {children: ReactNode}) {
  const [type, setType] = useState<AsideType>('closed');

  return (
    <AsideContext.Provider
      value={{
        type,
        open: setType,
        close: () => setType('closed'),
      }}
    >
      {children}
    </AsideContext.Provider>
  );
}

export function Aside({
  children,
  heading,
  type,
}: {
  children?: ReactNode;
  heading: ReactNode;
  type: AsideType;
}) {
  const {type: activeType, close} = useAside();
  const expanded = type === activeType;
  const id = useId();

  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [close, expanded]);

  return (
    <div
      aria-modal
      className={`overlay ${expanded ? 'expanded' : ''}`}
      role="dialog"
    >
      <button className="close-outside" onClick={close} />
      <aside>
        <header>
          <h3>{heading}</h3>
          <button className="close" onClick={close} aria-label="Close">
            &times;
          </button>
        </header>
        <main>{children}</main>
      </aside>
    </div>
  );
}
