/**
 * The store's llms.txt, a setting the merchant edits: `llms.txt` serves it and `robots.txt` names it when there is
 * one, both with `CacheSettings()` through this one document, so they share its cache entry (B-407).
 */
export const LLMS_TXT_QUERY = `#graphql
  query LlmsTxt {
    shop {
      llmsTxt
    }
  }
` as const;
