import { get, set, del } from 'idb-keyval'

// Voice notes are stored separately from the main workspace blob (keyed by
// section id) so audio never bloats the state that loads every session.

const key = (sectionId: string) => `vn:${sectionId}`

export const getVoiceNote = (sectionId: string) => get<string>(key(sectionId))
export const setVoiceNote = (sectionId: string, dataUrl: string) => set(key(sectionId), dataUrl)
export const delVoiceNote = (sectionId: string) => del(key(sectionId))

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new Error('read failed'))
    r.onload = () => resolve(r.result as string)
    r.readAsDataURL(blob)
  })
}
