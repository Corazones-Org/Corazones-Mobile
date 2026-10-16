// Catalogs whose labels live in the database (interests, outing types): a stable `code` for logic
// and matching, and labels per language for display.
export type CatalogItem = { code: string; labels: Record<string, string> };
export type CatalogOption = CatalogItem & { id: number };

// Labels come in every supported language; Spanish is always present.
export const catalogLabel = ({ code, labels }: CatalogItem, language: string) =>
  labels[language] ?? labels.es ?? code;
