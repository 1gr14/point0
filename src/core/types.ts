export type IsEmptyObject<T> = keyof T extends never ? true : false
