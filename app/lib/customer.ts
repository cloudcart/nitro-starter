/**
 * A query about the signed-in customer, or null for a guest — and for a visitor whose token the API turned down:
 * Nitrogen answers that with the sign-in redirect (a thrown `Response`), which a page guests use too does not follow,
 * it just has no customer (B-204). Any other error is the caller's.
 *
 * @example const result = await ifSignedIn(customerAccount, () => customerAccount.query(CUSTOMER_QUERY));
 */
export async function ifSignedIn<T>(
  customerAccount: {isLoggedIn(): Promise<boolean>},
  query: () => Promise<T>,
): Promise<T | null> {
  if (!(await customerAccount.isLoggedIn())) return null;
  try {
    return await query();
  } catch (error) {
    if (error instanceof Response) return null;
    throw error;
  }
}
