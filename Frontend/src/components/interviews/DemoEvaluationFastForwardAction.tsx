import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateCompleteDemoEvaluation, getDemoPostInterviewFastForwardEligibility, getDemoPostInterviewFastForwardRoute } from '../../services/demoPostInterviewFastForward'
import { useDemoStore } from '../../hooks/useDemoStore'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

type Props = { interviewId: string; className?: string }

export function DemoEvaluationFastForwardAction({ interviewId, className }: Props) {
  const { state, dispatch } = useDemoStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const eligibility = getDemoPostInterviewFastForwardEligibility(state, interviewId, true)
  if (!eligibility.eligible) return null

  function generate() {
    try {
      const timestamp = new Date().toISOString()
      const result = generateCompleteDemoEvaluation({ state, interviewId, timestamp, demoMode: true })
      dispatch({ type: 'APPLY_DEMO_POST_INTERVIEW_FAST_FORWARD', payload: { result } })
      setOpen(false)
      const routeState = result.stage === 'TRANSCRIPT_REVIEW' || result.stage === 'ANALYSIS_REVIEW'
        ? { demoFastForwardBlockers: result.blockers }
        : result.error ? { demoFastForwardError: result.error } : undefined
      navigate(getDemoPostInterviewFastForwardRoute(result), { state: routeState })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Demo evaluation could not be generated.')
    }
  }

  return <>
    <Button className={className} variant="secondary" onClick={() => { setError(''); setOpen(true) }}>Generate complete demo evaluation</Button>
    <Dialog open={open} title="Generate complete demo evaluation?" onClose={() => setOpen(false)}>
      <p className="mt-0 text-sm leading-6 text-aura-text-secondary">AURA will create and approve simulated transcript and analysis data, then prepare the scoring workspace. This is for demo purposes only and does not use audio or real speech-to-text.</p>
      {error ? <p className="rounded-aura-sm bg-aura-danger-soft p-3 text-sm text-aura-danger" role="alert">{error}</p> : null}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={generate}>Generate demo evaluation</Button></div>
    </Dialog>
  </>
}
