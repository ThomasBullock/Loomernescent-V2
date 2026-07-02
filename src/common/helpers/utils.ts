export const normalize = (s: string, toLowerCase: boolean = true) => {
  let normalized = s
    .replace(/\s*\([^)]*\)\s*$/, "") // drop trailing "(Expanded)", "(2001 Remaster)", etc.
    .replace(/\s*-\s*\d{4}.*$/, "") // drop trailing "- 2008 Remastered Version", "- 2001 Remaster", etc.
    .trim();
  if (toLowerCase) {
    normalized = normalized.toLowerCase();
  }
  return normalized;
};
