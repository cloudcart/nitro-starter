import {Form, useSearchParams} from 'react-router';
import {MagnifyingGlassIcon} from '@heroicons/react/24/outline';

interface SearchFormProps {
  className?: string;
}

export function SearchForm({className}: SearchFormProps) {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';

  return (
    <Form method="get" action="/search" className={className ?? 'flex gap-2 mb-8'}>
      <div className="relative flex-1">
        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-gray-400 pointer-events-none" />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search products..."
          autoComplete="off"
          className="form-input w-full py-3 pl-11 pr-4 border-[1.5px] border-gray-200 rounded-[10px] text-[0.95rem] transition-[border-color] duration-150 focus:border-brand focus:ring-0"
        />
      </div>
      <button type="submit" className="py-3 px-6 bg-dark text-light border-none rounded-[10px] font-semibold text-sm hover:bg-gray-900 transition-colors duration-150">Search</button>
    </Form>
  );
}
