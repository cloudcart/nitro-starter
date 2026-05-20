import {useState} from 'react';
import {useSearchParams, useNavigate} from 'react-router';
import type {Filter, FilterValue} from '@cloudcart/nitrogen';
import {filterInputToParam, isFilterActive} from '~/lib/filters';
import {ChevronDownIcon} from '@heroicons/react/20/solid';

interface ProductFiltersProps {
  filters?: Filter[];
  totalCount?: number | null;
}

export function ProductFilters({filters = [], totalCount}: ProductFiltersProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentSort = searchParams.get('sort') ?? '';
  const currentMinPrice = searchParams.get('minPrice') ?? '';
  const currentMaxPrice = searchParams.get('maxPrice') ?? '';

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('cursor');
    params.delete('direction');
    navigate(`?${params.toString()}`, {preventScrollReset: true});
  }

  function toggleFilterValue(input: string) {
    const param = filterInputToParam(input);
    if (!param) return;

    const params = new URLSearchParams(searchParams);
    const existing = params.getAll(param.key);

    if (existing.includes(param.value)) {
      // Remove this specific value while keeping others for the same key
      params.delete(param.key);
      for (const v of existing) {
        if (v !== param.value) params.append(param.key, v);
      }
    } else {
      // Add this value alongside existing ones
      params.append(param.key, param.value);
    }
    params.delete('cursor');
    params.delete('direction');
    navigate(`?${params.toString()}`, {preventScrollReset: true});
  }

  function clearAll() {
    navigate('?', {preventScrollReset: true});
  }

  const hasActiveFilters = Array.from(searchParams.keys()).some(
    (k) => !['sort', 'cursor', 'direction'].includes(k),
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Sort */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">Sort by</label>
        <select
          className="form-select w-full py-2 px-3 border-gray-200 rounded-md text-[0.85rem] text-dark cursor-pointer focus:border-brand focus:ring-0"
          value={currentSort}
          onChange={(e) => updateParam('sort', e.target.value)}
        >
          <option value="">Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="title-asc">Alphabetically: A-Z</option>
          <option value="title-desc">Alphabetically: Z-A</option>
          <option value="created-desc">Newest</option>
          <option value="best-selling">Best Selling</option>
        </select>
      </div>

      {totalCount != null && (
        <div className="text-xs text-gray-500 pb-1 border-b border-gray-100">{totalCount} products</div>
      )}

      {/* Dynamic filters from API */}
      {filters.map((filter) => (
        <FilterGroup
          key={filter.id}
          filter={filter}
          searchParams={searchParams}
          onToggle={toggleFilterValue}
          onUpdateParam={updateParam}
          currentMinPrice={currentMinPrice}
          currentMaxPrice={currentMaxPrice}
        />
      ))}

      {hasActiveFilters && (
        <button className="bg-transparent border-none text-brand text-xs font-medium cursor-pointer underline text-left p-0 font-sans" onClick={clearAll}>
          Clear all filters
        </button>
      )}
    </div>
  );
}

function FilterGroup({
  filter,
  searchParams,
  onToggle,
  onUpdateParam,
  currentMinPrice,
  currentMaxPrice,
}: {
  filter: Filter;
  searchParams: URLSearchParams;
  onToggle: (input: string) => void;
  onUpdateParam: (key: string, value: string) => void;
  currentMinPrice: string;
  currentMaxPrice: string;
}) {
  switch (filter.type) {
    case 'LIST':
      return <FilterListGroup filter={filter} searchParams={searchParams} onToggle={onToggle} />;
    case 'SWATCH_COLOR':
      return <FilterSwatchColorGroup filter={filter} searchParams={searchParams} onToggle={onToggle} />;
    case 'SWATCH_IMAGE':
      return <FilterSwatchImageGroup filter={filter} searchParams={searchParams} onToggle={onToggle} />;
    case 'PRICE_RANGE':
      return (
        <FilterPriceRangeGroup
          filter={filter}
          onUpdateParam={onUpdateParam}
          currentMinPrice={currentMinPrice}
          currentMaxPrice={currentMaxPrice}
        />
      );
    case 'RANGE':
      return <FilterRangeGroup filter={filter} onUpdateParam={onUpdateParam} />;
    case 'BOOLEAN':
      return <FilterBooleanGroup filter={filter} searchParams={searchParams} onToggle={onToggle} />;
    default:
      return null;
  }
}

function FilterListGroup({filter, searchParams, onToggle}: {filter: Filter; searchParams: URLSearchParams; onToggle: (input: string) => void}) {
  const VISIBLE_COUNT = 7;
  const [expanded, setExpanded] = useState(false);
  const hasMore = filter.values.length > VISIBLE_COUNT;
  const visibleValues = expanded ? filter.values : filter.values.slice(0, VISIBLE_COUNT);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">{filter.label}</label>
      <div className="flex flex-col gap-1">
        {visibleValues.map((v) => (
          <label key={v.id} className="flex items-center gap-1.5 text-[0.85rem] cursor-pointer py-0.5 [&_input]:shrink-0">
            <input
              type="checkbox"
              className="form-checkbox rounded border-gray-300 text-brand focus:ring-brand"
              checked={isFilterActive(searchParams, v.input)}
              onChange={() => onToggle(v.input)}
            />
            <span className="flex-1 text-dark truncate">{v.label}</span>
            <span className="text-xs text-gray-400 shrink-0">({v.count})</span>
          </label>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-dark transition-colors duration-150 p-0 bg-transparent border-none cursor-pointer font-sans"
        >
          <ChevronDownIcon className={`size-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Show less' : `Show all ${filter.values.length}`}
        </button>
      )}
    </div>
  );
}

function FilterSwatchColorGroup({filter, searchParams, onToggle}: {filter: Filter; searchParams: URLSearchParams; onToggle: (input: string) => void}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">{filter.label}</label>
      <div className="flex flex-wrap gap-1.5">
        {filter.values.map((v) => (
          <button
            key={v.id}
            className={`size-7 rounded-full border-2 cursor-pointer p-0 transition-[border-color,box-shadow] duration-150 hover:border-gray-400 ${isFilterActive(searchParams, v.input) ? 'border-dark shadow-[0_0_0_2px_var(--color-light),0_0_0_4px_var(--color-dark)]' : 'border-gray-200'}`}
            title={`${v.label} (${v.count})`}
            onClick={() => onToggle(v.input)}
            style={{backgroundColor: v.swatchColor ?? '#ccc'}}
          />
        ))}
      </div>
    </div>
  );
}

function FilterSwatchImageGroup({filter, searchParams, onToggle}: {filter: Filter; searchParams: URLSearchParams; onToggle: (input: string) => void}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">{filter.label}</label>
      <div className="flex flex-wrap gap-1.5">
        {filter.values.map((v) => (
          <button
            key={v.id}
            className={`size-9 rounded-md border-2 cursor-pointer p-0.5 bg-light transition-[border-color] duration-150 overflow-hidden hover:border-gray-400 ${isFilterActive(searchParams, v.input) ? 'border-dark' : 'border-gray-200'}`}
            title={`${v.label} (${v.count})`}
            onClick={() => onToggle(v.input)}
          >
            {v.swatchImage && <img src={v.swatchImage} alt={v.label} className="w-full h-full object-cover rounded" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterPriceRangeGroup({filter, onUpdateParam, currentMinPrice, currentMaxPrice}: {
  filter: Filter;
  onUpdateParam: (key: string, value: string) => void;
  currentMinPrice: string;
  currentMaxPrice: string;
}) {
  const min = filter.minValue?.value ?? 0;
  const max = filter.maxValue?.value ?? 0;
  const currency = filter.minValue?.currencyCode ?? '';

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
        {filter.label}
        {currency && <span className="font-normal normal-case"> ({currency})</span>}
      </label>
      <div className="flex items-center gap-2">
        <input
          key={`min-${currentMinPrice}`}
          type="number"
          className="form-input w-full py-2 px-2 border-gray-200 rounded-md text-[0.85rem] focus:border-brand focus:ring-0"
          placeholder={String(min)}
          defaultValue={currentMinPrice}
          onBlur={(e) => onUpdateParam('minPrice', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onUpdateParam('minPrice', (e.target as HTMLInputElement).value)}
          min={min}
          max={max}
        />
        <span className="text-gray-300 shrink-0">&mdash;</span>
        <input
          key={`max-${currentMaxPrice}`}
          type="number"
          className="form-input w-full py-2 px-2 border-gray-200 rounded-md text-[0.85rem] focus:border-brand focus:ring-0"
          placeholder={String(max)}
          defaultValue={currentMaxPrice}
          onBlur={(e) => onUpdateParam('maxPrice', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onUpdateParam('maxPrice', (e.target as HTMLInputElement).value)}
          min={min}
          max={max}
        />
      </div>
    </div>
  );
}

function FilterRangeGroup({filter, onUpdateParam}: {filter: Filter; onUpdateParam: (key: string, value: string) => void}) {
  const min = filter.minValue?.value ?? 0;
  const max = filter.maxValue?.value ?? 0;
  const step = filter.rangeStep ?? 1;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">{filter.label}</label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0 min-w-8 text-center">{min}</span>
        <input
          type="range"
          className="form-range flex-1 accent-brand"
          min={min}
          max={max}
          step={step}
          defaultValue={max}
        />
        <span className="text-xs text-gray-500 shrink-0 min-w-8 text-center">{max}</span>
      </div>
    </div>
  );
}

function FilterBooleanGroup({filter, searchParams, onToggle}: {filter: Filter; searchParams: URLSearchParams; onToggle: (input: string) => void}) {
  const trueValue = filter.values.find((v) => {
    try {
      const parsed = JSON.parse(v.input);
      return parsed.onSale === true || parsed.isNew === true || parsed.isFeatured === true;
    } catch {
      return false;
    }
  });

  if (!trueValue) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[0.85rem] cursor-pointer py-0.5">
        <input
          type="checkbox"
          className="form-checkbox rounded border-gray-300 text-brand focus:ring-brand shrink-0"
          checked={isFilterActive(searchParams, trueValue.input)}
          onChange={() => onToggle(trueValue.input)}
        />
        <span className="flex-1 text-dark">{filter.label}</span>
        <span className="text-xs text-gray-400 shrink-0">({trueValue.count})</span>
      </label>
    </div>
  );
}
