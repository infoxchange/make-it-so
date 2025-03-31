export function remapKeys(
  object: Record<string, unknown>,
  keyMap: Record<string, string>,
) {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => {
      const newKey = keyMap[key] ?? key;
      return [newKey, value];
    }),
  );
}
