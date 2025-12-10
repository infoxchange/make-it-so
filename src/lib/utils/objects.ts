export function remapKeys<
  SourceObject extends object,
  MapObject extends Record<keyof SourceObject, string>,
>(
  object: SourceObject,
  keyMap: Readonly<MapObject>,
): {
  [k in keyof SourceObject as k extends keyof MapObject
    ? MapObject[k]
    : k]: SourceObject[k];
} {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => {
      // @ts-expect-error the typing for map() reduces keys to general string
      const newKey = keyMap[key] ?? key;
      return [newKey, value];
    }),
  );
}
