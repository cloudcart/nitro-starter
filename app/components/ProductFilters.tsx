import {useSearchParams, useNavigate} from 'react-router';

export function ProductFilters() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentSort = searchParams.get('sort') ?? '';
  const currentMinPrice = searchParams.get('minPrice') ?? '';
  const currentMaxPrice = searchParams.get('maxPrice') ?? '';
  const currentAvailable = searchParams.get('available') ?? '';
  const currentVendor = searchParams.get('vendor') ?? '';

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

  const hasActiveFilters = currentVendor || currentMinPrice || currentMaxPrice || currentAvailable;

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
            key={`min-${currentMinPrice}`}
            type="number"
            className="filter-price-input"
            placeholder="Min"
            defaultValue={currentMinPrice}
            onBlur={(e) => updateFilter('minPrice', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && updateFilter('minPrice', (e.target as HTMLInputElement).value)}
            min={0}
          />
          <span className="filter-price-sep">—</span>
          <input
            key={`max-${currentMaxPrice}`}
            type="number"
            className="filter-price-input"
            placeholder="Max"
            defaultValue={currentMaxPrice}
            onBlur={(e) => updateFilter('maxPrice', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && updateFilter('maxPrice', (e.target as HTMLInputElement).value)}
            min={0}
          />
        </div>
      </div>

      {/* Clear All */}
      {hasActiveFilters && (
        <button className="filter-clear" onClick={clearAll}>
          Clear all filters
        </button>
      )}
    </div>
  );
}
