import {createContext, useContext, useState, useEffect, type ReactNode} from 'react';
import {XMarkIcon} from '@heroicons/react/24/outline';

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
      className={`fixed inset-0 bg-black/30 z-[100] transition-[opacity,visibility] duration-300 ${expanded ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
      role="dialog"
    >
      <button className="absolute inset-0 bg-transparent border-none w-[calc(100%-400px)] cursor-default" onClick={close} />
      <aside className={`fixed top-0 right-0 w-[min(400px,100vw)] h-screen bg-light shadow-[-4px_0_24px_rgba(0,0,0,0.12)] transition-transform duration-300 flex flex-col ${expanded ? 'translate-x-0' : 'translate-x-full'}`}>
        <header className="flex items-center justify-between px-5 h-16 border-b border-gray-200 shrink-0">
          <h3 className="text-[0.85rem] font-bold tracking-widest">{heading}</h3>
          <button
            type="button"
            onClick={close}
            className="rounded-md p-1 text-gray-400 hover:text-dark transition-colors duration-150"
            aria-label="Close"
          >
            <XMarkIcon className="size-6" />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-0">{children}</main>
      </aside>
    </div>
  );
}
