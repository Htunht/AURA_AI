export function getInterviewDetailPath(interviewId: string) {
  return `/interviews/${encodeURIComponent(interviewId)}`
}
