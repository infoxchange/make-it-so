export function convertToBase62Hash(string: string): string {
  const base62Chars =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let hash = "";
  let num = 0;
  for (let i = 0; i < string.length; i++) {
    num += string.charCodeAt(i);
  }
  while (num > 0) {
    hash = base62Chars[num % 62] + hash;
    num = Math.floor(num / 62);
  }
  return hash;
}

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
