import { Bold, Check, Copy, ExternalLink, Italic, Link2, List, ListOrdered, Redo2, RotateCcw, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState, type ClipboardEvent, type MouseEvent, type ReactNode } from 'react'
import type { Job } from '../../types/job'
import { buildShareableJobHtml, buildShareableJobPost } from '../../utils/jobSharing'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'

type CopyState = 'IDLE' | 'POST_COPIED' | 'LINK_COPIED' | 'FAILED'
type EditorCommand = 'bold' | 'italic' | 'insertUnorderedList' | 'insertOrderedList' | 'undo' | 'redo'

const toolbarButtonClass = 'inline-grid size-9 place-items-center rounded-aura-sm border border-transparent bg-transparent text-depth hover:border-harbor/15 hover:bg-harbor/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier disabled:opacity-40'

export function ShareJobDialog({
  open,
  job,
  applicationUrl,
  onClose,
}: {
  open: boolean
  job: Job
  applicationUrl: string
  onClose: () => void
}) {
  const generatedHtml = buildShareableJobHtml(job, applicationUrl)
  const generatedPlainText = buildShareableJobPost(job, applicationUrl)
  const [copyState, setCopyState] = useState<CopyState>('IDLE')
  const [characterCount, setCharacterCount] = useState(generatedPlainText.length)
  const [dirty, setDirty] = useState(false)
  const [linkEditorOpen, setLinkEditorOpen] = useState(false)
  const [linkValue, setLinkValue] = useState('')
  const [linkError, setLinkError] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)
  const savedRangeRef = useRef<Range | null>(null)

  useEffect(() => {
    if (!open || !editorRef.current) return
    editorRef.current.innerHTML = generatedHtml
    setCharacterCount(editorRef.current.innerText.length)
    setCopyState('IDLE')
    setDirty(false)
    setLinkEditorOpen(false)
    setLinkValue('')
    setLinkError('')
  }, [generatedHtml, open])

  function syncEditor(markDirty = true) {
    setCharacterCount(editorRef.current?.innerText.length ?? 0)
    setCopyState('IDLE')
    if (markDirty) setDirty(true)
  }

  function runCommand(event: MouseEvent<HTMLButtonElement>, command: EditorCommand) {
    event.preventDefault()
    editorRef.current?.focus()
    document.execCommand(command)
    syncEditor()
  }

  function openLinkEditor(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    const editor = editorRef.current
    const selection = window.getSelection()
    const range = selection?.rangeCount ? selection.getRangeAt(0) : undefined
    savedRangeRef.current = editor && range && editor.contains(range.commonAncestorContainer) ? range.cloneRange() : null
    setLinkValue('')
    setLinkError('')
    setLinkEditorOpen(true)
  }

  function applyLink() {
    const value = linkValue.trim()
    const candidate = /^(https?:\/\/)/i.test(value) ? value : `https://${value}`
    let url: URL
    try {
      url = new URL(candidate)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol')
    } catch {
      setLinkError('Enter a valid website address.')
      return
    }

    const editor = editorRef.current
    const range = savedRangeRef.current
    if (!editor || !range) {
      setLinkError('Select text in the job post first.')
      return
    }

    editor.focus()
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    if (range.collapsed) {
      const anchor = document.createElement('a')
      anchor.href = url.toString()
      anchor.textContent = url.toString()
      range.insertNode(anchor)
      range.setStartAfter(anchor)
      range.collapse(true)
      selection?.removeAllRanges()
      selection?.addRange(range)
    } else {
      document.execCommand('createLink', false, url.toString())
    }
    setLinkEditorOpen(false)
    setLinkValue('')
    setLinkError('')
    savedRangeRef.current = null
    syncEditor()
  }

  function pastePlainText(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain'))
    syncEditor()
  }

  async function copyText(value: string, success: CopyState) {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setCopyState(success)
    } catch {
      setCopyState('FAILED')
    }
  }

  function selectEditorContent() {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const range = document.createRange()
    range.selectNodeContents(editor)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  async function copyJobPost() {
    const editor = editorRef.current
    if (!editor) return
    const plainText = editor.innerText
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      if (navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([editor.innerHTML], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        })])
      } else {
        await navigator.clipboard.writeText(plainText)
      }
      setCopyState('POST_COPIED')
    } catch {
      selectEditorContent()
      setCopyState('FAILED')
    }
  }

  function resetEditor() {
    if (!editorRef.current) return
    editorRef.current.innerHTML = generatedHtml
    syncEditor(false)
    setDirty(false)
    setLinkEditorOpen(false)
  }

  return (
    <Dialog
      open={open}
      title="Share job"
      description="Format the post, add the recruitment contact details, then copy it."
      size="wide"
      onClose={onClose}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-depth">Job post</span>
            <span className="text-xs tabular-nums text-aura-text-muted">{characterCount.toLocaleString()} characters</span>
          </div>

          <div className="overflow-hidden rounded-aura-sm border border-harbor/20 bg-white shadow-inner focus-within:border-marine focus-within:ring-2 focus-within:ring-glacier/35">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-harbor/15 bg-frost/65 px-2 py-1.5" role="toolbar" aria-label="Job post formatting">
              <ToolbarButton label="Bold" onMouseDown={(event) => runCommand(event, 'bold')}><Bold size={16} /></ToolbarButton>
              <ToolbarButton label="Italic" onMouseDown={(event) => runCommand(event, 'italic')}><Italic size={16} /></ToolbarButton>
              <span className="mx-1 h-5 w-px bg-harbor/15" aria-hidden="true" />
              <ToolbarButton label="Bullet list" onMouseDown={(event) => runCommand(event, 'insertUnorderedList')}><List size={17} /></ToolbarButton>
              <ToolbarButton label="Numbered list" onMouseDown={(event) => runCommand(event, 'insertOrderedList')}><ListOrdered size={17} /></ToolbarButton>
              <ToolbarButton label="Add link" onMouseDown={openLinkEditor}><Link2 size={16} /></ToolbarButton>
              <span className="mx-1 h-5 w-px bg-harbor/15" aria-hidden="true" />
              <ToolbarButton label="Undo" onMouseDown={(event) => runCommand(event, 'undo')}><Undo2 size={16} /></ToolbarButton>
              <ToolbarButton label="Redo" onMouseDown={(event) => runCommand(event, 'redo')}><Redo2 size={16} /></ToolbarButton>
            </div>

            {linkEditorOpen ? <div className="flex flex-col gap-2 border-b border-harbor/15 bg-frost/35 p-3 sm:flex-row sm:items-start"><div className="min-w-0 flex-1"><Input autoFocus aria-label="Link address" placeholder="https://example.com" value={linkValue} onChange={(event) => { setLinkValue(event.target.value); setLinkError('') }} onKeyDown={(event) => { if (event.key === 'Enter') applyLink(); if (event.key === 'Escape') setLinkEditorOpen(false) }} />{linkError ? <p className="mb-0 mt-1 text-xs font-semibold text-aura-danger">{linkError}</p> : null}</div><div className="flex gap-2"><Button variant="ghost" onClick={() => setLinkEditorOpen(false)}>Cancel</Button><Button onClick={applyLink}>Add link</Button></div></div> : null}

            <div
              ref={editorRef}
              className="min-h-[28rem] max-h-[34rem] overflow-y-auto px-5 py-4 text-sm leading-6 text-depth outline-none [&_a]:text-harbor [&_a]:underline [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_strong]:font-bold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6"
              contentEditable
              role="textbox"
              aria-label="Editable job post"
              aria-multiline="true"
              onInput={() => syncEditor()}
              onPaste={pastePlainText}
              spellCheck
              suppressContentEditableWarning
            />
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-aura-md border border-harbor/15 bg-frost/55 p-4">
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-aura-text-muted">Application link</p>
            <p className="mb-0 mt-2 break-all text-xs leading-5 text-aura-text-secondary">{applicationUrl}</p>
            <div className="mt-4 grid gap-2">
              <Button variant="secondary" className="w-full" onClick={() => copyText(applicationUrl, 'LINK_COPIED')}>
                {copyState === 'LINK_COPIED' ? <Check size={16} /> : <Link2 size={16} />}
                {copyState === 'LINK_COPIED' ? 'Link copied' : 'Copy link'}
              </Button>
              <a className="inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-harbor/20 bg-white px-4 text-sm font-semibold text-depth no-underline hover:bg-harbor/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" href={applicationUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} />Preview application</a>
            </div>
          </div>

          <p className="m-0 text-xs leading-5 text-aura-text-muted">Formatting is preserved where the destination supports rich text. A plain-text version is copied as a fallback.</p>

          <div className="mt-auto grid gap-2">
            <Button variant="ghost" className="w-full" disabled={!dirty} onClick={resetEditor}><RotateCcw size={16} />Reset text</Button>
            <Button className="w-full" disabled={!characterCount} onClick={copyJobPost}>
              {copyState === 'POST_COPIED' ? <Check size={16} /> : <Copy size={16} />}
              {copyState === 'POST_COPIED' ? 'Job post copied' : 'Copy job post'}
            </Button>
          </div>

          <div className="min-h-5" aria-live="polite">
            {copyState === 'FAILED' ? <p className="m-0 text-xs font-semibold text-aura-warning">Copy was blocked. The post is selected—press Command+C or Ctrl+C.</p> : null}
          </div>
        </aside>
      </div>
    </Dialog>
  )
}

function ToolbarButton({ label, children, onMouseDown }: { label: string; children: ReactNode; onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void }) {
  return <button className={toolbarButtonClass} type="button" aria-label={label} title={label} onMouseDown={onMouseDown}>{children}</button>
}
