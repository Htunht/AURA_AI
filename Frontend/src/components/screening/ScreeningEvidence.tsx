import { FileCheck2, FileText } from 'lucide-react'
import type { Application } from '../../types/application'
import type { Evaluation, EvidenceReference } from '../../types/evaluation'

type ScreeningEvidenceProps = {
  application: Application
  evaluation: Evaluation
}

function resolveSourceLabel(application: Application, evidence: EvidenceReference) {
  if (evidence.sourceType === 'APPLICATION_ANSWER') {
    return application.answers.find((answer) => answer.id === evidence.sourceId)?.label ?? 'Application evidence'
  }
  if (evidence.sourceType === 'DOCUMENT') {
    const document = application.documents.find((item) => item.id === evidence.sourceId)
    return document ? `${document.documentType} · ${document.fileName}` : 'Application evidence'
  }
  return 'Application evidence'
}

export function ScreeningEvidence({ application, evaluation }: ScreeningEvidenceProps) {
  const groups = evaluation.criterionScores.filter((criterion) => criterion.evidence.length > 0)
  return (
    <section aria-labelledby="evidence-title">
      <div className="mb-4">
        <h2 id="evidence-title" className="m-0 text-lg font-semibold text-depth">Evidence review</h2>
        <p className="mb-0 mt-1 text-xs text-aura-text-muted">Application sources used to support each criterion assessment.</p>
      </div>
      {groups.length ? <div className="grid gap-4">{groups.map((criterion) => <article className="border-l-2 border-glacier pl-4" key={criterion.criterionKey}><h3 className="m-0 text-sm font-semibold text-depth">{criterion.name}</h3><div className="mt-3 grid gap-2">{criterion.evidence.map((evidence, index) => { const SourceIcon = evidence.sourceType === 'DOCUMENT' ? FileText : FileCheck2; return <div className="rounded-aura-sm border border-harbor/10 bg-frost/55 p-3" key={`${evidence.sourceId}-${index}`}><div className="flex items-center gap-2 text-xs font-semibold text-harbor"><SourceIcon size={14} className="text-marine" aria-hidden="true" />{resolveSourceLabel(application, evidence)}</div><blockquote className="mb-0 ml-0 mt-2 border-0 text-sm leading-6 text-aura-text-secondary">“{evidence.excerpt}”</blockquote></div>})}</div></article>)}</div> : <p className="m-0 text-sm text-aura-text-secondary">No supporting evidence was returned for this screening.</p>}
    </section>
  )
}
