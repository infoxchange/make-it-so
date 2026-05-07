export function remapKeys(object, keyMap) {
    return Object.fromEntries(Object.entries(object).map(([key, value]) => {
        // @ts-expect-error the typing for map() reduces keys to general string
        const newKey = keyMap[key] ?? key;
        return [newKey, value];
    }));
}
