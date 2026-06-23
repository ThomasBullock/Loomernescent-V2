export const normalize = (s: string, toLowerCase: boolean = true) => {
  let normalized = s
    .replace(/\s*\([^)]*\)\s*$/, "") // drop trailing "(Expanded)", "(2001 Remaster)", etc.
    .replace(/\s*-\s*\d{4}\s+Remaster\s*$/, "") // drop trailing "- 2001 Remaster"
    .trim();
  if (toLowerCase) {
    normalized = normalized.toLowerCase();
  }
  return normalized;
};
