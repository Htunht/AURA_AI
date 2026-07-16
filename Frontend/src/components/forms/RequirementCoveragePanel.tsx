import { AlertCircle, CheckCircle2, Circle } from 'lucide-react'
import type { ApplicationFormField } from '../../types/applicationForm'
import type { JobRequirement } from '../../types/jobRequirement'
import { evaluateRequirementCoverage } from '../../utils/hiringWorkflowSetup'
import { Card } from '../ui/Card'

export function RequirementCoveragePanel({ requirements, fields }: { requirements: JobRequirement[]; fields: ApplicationFormField[] }) {
  const coverage = evaluateRequirementCoverage(requirements, fields).filter((item) => item.requirement.type !== 'RESPONSIBILITY' || item.covered)
  return <Card className="p-5"><h2 className="m-0 text-base font-semibold text-depth">Requirement coverage</h2><p className="mb-0 mt-1 text-xs text-aura-text-secondary">Required qualifications need a direct evidence question before publishing.</p><div className="mt-4 grid gap-3">{coverage.map((item) => <div className="flex items-start gap-3" key={item.requirement.id}>{item.covered ? <CheckCircle2 className="mt-0.5 text-aura-success" size={17} /> : item.requirement.importance === 'REQUIRED' ? <AlertCircle className="mt-0.5 text-aura-danger" size={17} /> : <Circle className="mt-0.5 text-aura-warning" size={17} />}<div><p className="m-0 text-sm font-semibold text-depth">{item.requirement.label}</p><p className="mb-0 mt-0.5 text-xs text-aura-text-muted">{item.covered ? `Covered by ${item.fields.map((field) => `“${field.label}”`).join(', ')}` : item.requirement.importance === 'REQUIRED' ? 'Missing required evidence' : 'Preferred qualification · no direct evidence question'}</p></div></div>)}</div></Card>
}
