export declare function remapKeys<SourceObject extends object, MapObject extends Record<keyof SourceObject, string>>(object: SourceObject, keyMap: Readonly<MapObject>): {
    [k in keyof SourceObject as k extends keyof MapObject ? MapObject[k] : k]: SourceObject[k];
};
//# sourceMappingURL=objects.d.ts.map