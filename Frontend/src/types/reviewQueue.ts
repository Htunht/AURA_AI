import type { Application } from './application'
import type { Candidate } from './candidate'
import type { Decision } from './decision'
import type { Evaluation, Recommendation } from './evaluation'
import type { Job } from './job'

export type HumanReviewCategory =
  | 'RECOMMENDED'
  | 'NEEDS_REVIEW'
  | 'NOT_RECOMMENDED'
  | 'FAILED'
  | 'REVIEWED'

export type HumanReviewQueueItem = {
  application: Application
  candidate: Candidate
  job: Job
  evaluation?: Evaluation
  decision?: Decision
  category: HumanReviewCategory
  finalRecommendation?: Recommendation
  reviewReasons: string[]
}
