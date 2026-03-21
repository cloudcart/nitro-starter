import {useSearchParams, useNavigate} from 'react-router';

interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

interface ProductFiltersProps {
  availableFilters?: {
    vendors?: string[];
    tags?: string[];
    options?: {name: string; values: string[]}[];
  };
  maxPrice?: number;
}

export function ProductFilters({availableFilters, maxPrice = 500}: ProductFiltersProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentSort = searchParams.get('sort') ?? '';
  const currentVendor = searchParams.get('vendor') ?? '';
  const currentTag = searchParams.get('tag') ?? '';
  const currentMinPrice = searchParams.get('minPrice') ?? '';
  const currentMaxPrice = searchParams.get('maxPrice') ?? '';
  const currentAvailable = searchParams.get('available') ?? '';

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset cursor when filters change
    params.delete('cursor');
    params.delete('direction');
    navigate(`?${params.toString()}`, {preventScrollReset: true});
  }

  function clearAll() {
    navigate('?', {preventScrollReset: true});
  }

  const hasActiveFilters = currentVendor || currentTag || currentMinPrice || currentMaxPrice || currentAvailable;

  return (
    <div className="product-filters">
      {/* Sort */}
      <div className="filter-group">
        <label className="filter-label">Sort by</label>
        <select
          className="filter-select"
          value={currentSort}
          onChange={(e) => updateFilter('sort', e.target.value)}
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

      {/* Availability */}
      <div className="filter-group">
        <label className="filter-label">
          <input
            type="checkbox"
            checked={currentAvailable === 'true'}
            onChange={(e) => updateFilter('available', e.target.checked ? 'true' : '')}
          />
          {' '}In stock only
        </label>
      </div>

      {/* Price Range */}
      <div className="filter-group">
        <label className="filter-label">Price</label>
        <div className="filter-price-range">
          <input
            type="number"
            className="filter-price-input"
            placeholder="Min"
            value={currentMinPrice}
            onChange={(e) => updateFilter('minPrice', e.target.value)}
            min={0}
          />
          <span className="filter-price-sep">—</span>
          <input
            type="number"
            className="filter-price-input"
            placeholder="Max"
            value={currentMaxPrice}
            onChange={(e) => updateFilter('maxPrice', e.target.value)}
            min={0}
          />
        </div>
      </div>

      {/* Vendor */}
      {availableFilters?.vendors && availableFilters.vendors.length > 0 && (
        <div className="filter-group">
          <label className="filter-label">Brand</label>
          <select
            className="filter-select"
            value={currentVendor}
            onChange={(e) => updateFilter('vendor', e.target.value)}
          >
            <option value="">All brands</option>
            {availableFilters.vendors.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tags */}
      {availableFilters?.tags && availableFilters.tags.length > 0 && (
        <div className="filter-group">
          <label className="filter-label">Category</label>
          <div className="filter-tags">
            {availableFilters.tags.map((tag) => (
              <button
                key={tag}
                className={`filter-tag ${currentTag === tag ? 'active' : ''}`}
                onClick={() => updateFilter('tag', currentTag === tag ? '' : tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Variant Options */}
      {availableFilters?.options?.map((option) => (
        <div key={option.name} className="filter-group">
          <label className="filter-label">{option.name}</label>
          <div className="filter-tags">
            {option.values.map((value) => {
              const paramKey = `option_${option.name}`;
              const isActive = searchParams.get(paramKey) === value;
              return (
                <button
                  key={value}
                  className={`filter-tag ${isActive ? 'active' : ''}`}
                  onClick={() => updateFilter(paramKey, isActive ? '' : value)}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Clear All */}
      {hasActiveFilters && (
        <button className="filter-clear" onClick={clearAll}>
          Clear all filters
        </button>
      )}
    </div>
  );
}
