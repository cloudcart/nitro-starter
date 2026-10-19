import {useEffect, useRef} from 'react';
import {Form, type FormProps} from 'react-router';
import {SEARCH_ENDPOINT} from '~/lib/search';

type SearchFormProps = Omit<FormProps, 'children'> & {
  children: (args: {inputRef: React.RefObject<HTMLInputElement | null>}) => React.ReactNode;
};

/**
 * A search form that sends its term to the search page.
 * @example
 * ```tsx
 * <SearchForm>
 *  {({inputRef}) => (
 *    <>
 *      <input ref={inputRef} type="search" defaultValue={term} name="query" placeholder={t('search.placeholder')} />
 *      <button type="submit">{t('search.submit')}</button>
 *   </>
 *  )}
 *  </SearchForm>
 * ```
 */
export function SearchForm({children, ...props}: SearchFormProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useFocusOnCmdK(inputRef);

  if (typeof children !== 'function') return null;

  return (
    <Form method="get" action={SEARCH_ENDPOINT} {...props}>
      {children({inputRef})}
    </Form>
  );
}

/** Focuses the input on cmd+k, and leaves it on Escape. */
function useFocusOnCmdK(inputRef: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && event.metaKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (event.key === 'Escape') {
        inputRef.current?.blur();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [inputRef]);
}
