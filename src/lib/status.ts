import type { BookStatus, Status } from '../types'

interface StatusMeta {
  label: string
  /** Chip text/border colour. */
  color: string
  /** Chip background. */
  bg: string
  /** Rough fraction "done" for progress aggregation. */
  weight: number
}

// Distinct colour chip per status (spec §3.2). Tuned to the warm house palette.
export const STATUS_META: Record<Status, StatusMeta> = {
  'not-started': { label: 'Not started', color: '#8a8178', bg: '#f0ece6', weight: 0 },
  outlined: { label: 'Outlined', color: '#7a6f9c', bg: '#ece8f4', weight: 0.15 },
  drafting: { label: 'Drafting', color: '#b07b3c', bg: '#f7eddc', weight: 0.45 },
  'in-review': { label: 'In review', color: '#2f7d8c', bg: '#dff0f2', weight: 0.7 },
  revising: { label: 'Revising', color: '#c06a4a', bg: '#f8e7df', weight: 0.85 },
  finished: { label: 'Finished', color: '#4f7a4d', bg: '#e3f0e1', weight: 1 },
}

export const STATUS_ORDER: Status[] = [
  'not-started',
  'outlined',
  'drafting',
  'in-review',
  'revising',
  'finished',
]

// Book lifecycle chips for the library shelf.
export const BOOK_STATUS_META: Record<BookStatus, { label: string; color: string; bg: string }> = {
  idea: { label: 'Idea', color: '#7a6f9c', bg: '#ece8f4' },
  outlining: { label: 'Outlining', color: '#2f7d8c', bg: '#dff0f2' },
  writing: { label: 'Writing', color: '#b07b3c', bg: '#f7eddc' },
  revising: { label: 'Revising', color: '#c06a4a', bg: '#f8e7df' },
  launching: { label: 'Launching', color: '#9c6b2e', bg: '#f3e7d0' },
  published: { label: 'Published', color: '#4f7a4d', bg: '#e3f0e1' },
}

export const BOOK_STATUS_ORDER: BookStatus[] = [
  'idea',
  'outlining',
  'writing',
  'revising',
  'launching',
  'published',
]
