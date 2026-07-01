import { get, set, del } from 'idb-keyval'

// Chapter images live outside the main workspace blob (keyed by image id), so
// picture data never bloats the state that loads every session.
const key = (id: string) => `img:${id}`

export const getImage = (id: string) => get<string>(key(id))
export const setImage = (id: string, dataUrl: string) => set(key(id), dataUrl)
export const delImage = (id: string) => del(key(id))
