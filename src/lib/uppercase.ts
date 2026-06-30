import { Mark, mergeAttributes } from '@tiptap/core'

// A small custom mark for "all caps" — keeps the real letters, just displays
// them uppercase (so the underlying text stays editable/searchable). Toggle it
// with the built-in command: editor.chain().focus().toggleMark('uppercase').run()
export const Uppercase = Mark.create({
  name: 'uppercase',
  parseHTML() {
    return [{ tag: 'span[data-uppercase]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-uppercase': '', style: 'text-transform: uppercase' }), 0]
  },
})
