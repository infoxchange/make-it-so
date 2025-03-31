export function remapKeys<
  SourceObject extends object,
  MapObject extends Record<keyof SourceObject, string>,
>(
  object: SourceObject,
  keyMap: Readonly<MapObject>,
): { [k in keyof SourceObject]: MapObject[k] } {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => {
      // @ts-expect-error Typescript reduces map() to string
      const newKey = keyMap[key] ?? key;
      return [newKey, value];
    }),
  );
}
