import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import type { JobRequirement } from '../../types/jobRequirement'
import type { InterviewQuestionSetReadiness } from '../../utils/interviewQuestionSetReadiness'
import { Card } from '../ui/Card'

export function InterviewQuestionCoverage({ requirements, readiness }: { requirements: JobRequirement[]; readiness: InterviewQuestionSetReadiness }) {
  return <Card className="p-5"><h2 className="m-0 text-base font-semibold text-depth">Coverage</h2><div className="mt-4 grid gap-2">{requirements.filter((item) => item.importance !== 'SUPPORTING').map((requirement) => { const covered = readiness.coveredRequirementIds.includes(requirement.id); const missingRequired = !covered && requirement.importance === 'REQUIRED'; const Icon = covered ? CheckCircle2 : missingRequired ? AlertCircle : Circle; return <div className="flex items-center gap-2 text-sm" key={requirement.id}><Icon size={15} className={covered ? 'text-aura-success' : missingRequired ? 'text-aura-danger' : 'text-aura-text-muted'} /><span className="flex-1 text-depth">{requirement.label}</span><span className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">{covered ? 'Covered' : missingRequired ? 'Required missing' : 'Preferred missing'}</span></div> })}</div></Card>
}
