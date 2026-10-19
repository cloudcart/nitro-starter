/**
 * Product comparison: the compare button on the product page and the `/compare` page, which shows the chosen products
 * side by side, one row for each of their properties (`productComparison`).
 *
 * Off by default. Turn it on only for a store whose products have properties to compare: the characteristics their
 * categories give them (`Product.properties`), such as size, power or material. Without them the table has no rows —
 * only the products' pictures, titles and prices — and compares nothing. While it is off, `/compare` is not found.
 */
export const COMPARE_ENABLED = false;
