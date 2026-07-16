import { Plus, X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { Button } from '../ui/Button'

type SkillListEditorProps = {
  label: string
  skills: string[]
  otherSkills: string[]
  onChange: (skills: string[]) => void
  error?: string
  max?: number
}

const normalized = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()

export function SkillListEditor({ label, skills, otherSkills, onChange, error, max = 20 }: SkillListEditorProps) {
  const [input, setInput] = useState('')
  const [inputError, setInputError] = useState('')

  function addSkill() {
    const value = input.trim().replace(/\s+/g, ' ')
    if (!value) return setInputError('Enter a skill before adding it.')
    if (skills.length >= max) return setInputError(`Use no more than ${max} skills.`)
    if (skills.some((skill) => normalized(skill) === normalized(value))) return setInputError('This skill is already in the list.')
    if (otherSkills.some((skill) => normalized(skill) === normalized(value))) return setInputError('This skill is already in the other skill group.')
    onChange([...skills, value])
    setInput('')
    setInputError('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      addSkill()
    }
  }

  return <div>
    <label className="text-sm font-semibold text-depth" htmlFor={`skill-input-${label.replaceAll(' ', '-').toLowerCase()}`}>{label}</label>
    <div className="mt-2 flex gap-2">
      <input id={`skill-input-${label.replaceAll(' ', '-').toLowerCase()}`} className="h-10 min-w-0 flex-1 rounded-aura-sm border border-harbor/20 bg-white px-3 text-sm text-depth focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35" value={input} onChange={(event) => { setInput(event.target.value); setInputError('') }} onKeyDown={handleKeyDown} placeholder="Type a skill and press Enter" />
      <Button variant="secondary" onClick={addSkill}><Plus size={16} />Add</Button>
    </div>
    {inputError || error ? <p className="mb-0 mt-1.5 text-xs text-aura-danger" role="alert">{inputError || error}</p> : null}
    {skills.length > 0 ? <ul className="mt-3 flex flex-wrap gap-2 p-0">{skills.map((skill) => <li className="inline-flex items-center gap-1.5 rounded-full border border-harbor/15 bg-frost px-3 py-1.5 text-xs font-semibold text-depth" key={normalized(skill)}>{skill}<button type="button" className="inline-grid size-5 place-items-center rounded-full text-aura-text-muted hover:bg-white hover:text-aura-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" onClick={() => onChange(skills.filter((item) => item !== skill))} aria-label={`Remove ${skill} from ${label.toLowerCase()}`}><X size={13} /></button></li>)}</ul> : <p className="mb-0 mt-3 text-xs text-aura-text-muted">No skills added yet.</p>}
  </div>
}
