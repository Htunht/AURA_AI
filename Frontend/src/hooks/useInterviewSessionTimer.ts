import { useCallback, useEffect, useRef, useState } from 'react'
import type { InterviewSession } from '../types/interviewSession'

export type InterviewSessionTimer = { elapsedSeconds: number; formattedElapsed: string; isRunning: boolean; captureActiveSeconds: () => number }
export function formatSessionDuration(seconds: number) { const safe = Math.max(0, Math.floor(seconds)); const hours = Math.floor(safe / 3600); const minutes = Math.floor((safe % 3600) / 60); const remainder = safe % 60; return [hours, minutes, remainder].map((value) => String(value).padStart(2, '0')).join(':') }
export function useInterviewSessionTimer(session?: InterviewSession): InterviewSessionTimer {
  const [segmentSeconds, setSegmentSeconds] = useState(0)
  const baseRef = useRef(Date.now())
  const running = session?.status === 'IN_PROGRESS'
  useEffect(() => { baseRef.current = Date.now(); setSegmentSeconds(0); if (!running) return; const interval = window.setInterval(() => setSegmentSeconds(Math.max(0, Math.floor((Date.now() - baseRef.current) / 1000))), 1000); return () => window.clearInterval(interval) }, [running, session?.id, session?.resumedAt, session?.startedAt])
  const captureActiveSeconds = useCallback(() => running ? Math.max(0, Math.floor((Date.now() - baseRef.current) / 1000)) : 0, [running])
  const elapsedSeconds = (session?.accumulatedActiveSeconds ?? 0) + segmentSeconds
  return { elapsedSeconds, formattedElapsed: formatSessionDuration(elapsedSeconds), isRunning: running, captureActiveSeconds }
}
