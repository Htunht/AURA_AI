export type HiringWorkflowSetupStep = 'REQUIREMENTS' | 'APPLICATION_FORM' | 'SCREENING_RULES' | 'REVIEW'
export type HiringWorkflowSetupStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'READY' | 'PUBLISHED'
export type HiringWorkflowSetupProgress = { currentStep: HiringWorkflowSetupStep; completedSteps: HiringWorkflowSetupStep[]; status: HiringWorkflowSetupStatus; issues: string[] }
export type HiringWorkflowReadiness = { ready: boolean; requirementsReady: boolean; formReady: boolean; screeningReady: boolean; previewReady: boolean; blockingIssues: string[]; warnings: string[] }
export type RequirementScreeningRule = { id: string; requirementId: string; fieldKeys: string[]; importance: 'REQUIRED' | 'PREFERRED' | 'SUPPORTING'; scoringBehavior: 'THRESHOLD' | 'EVIDENCE_STRENGTH' | 'SUPPORTING_ONLY' }
