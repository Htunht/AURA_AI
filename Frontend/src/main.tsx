import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { DemoProvider } from './store'
import { ScreeningAutomationProvider } from './providers/ScreeningAutomationProvider'
import { InterviewSchedulingAutomationProvider } from './providers/InterviewSchedulingAutomationProvider'
import { SchedulingEmailAutomationProvider } from './providers/SchedulingEmailAutomationProvider'
import { InterviewQuestionAutomationProvider } from './providers/InterviewQuestionAutomationProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DemoProvider>
      <ScreeningAutomationProvider>
        <InterviewSchedulingAutomationProvider>
          <SchedulingEmailAutomationProvider>
            <InterviewQuestionAutomationProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </InterviewQuestionAutomationProvider>
          </SchedulingEmailAutomationProvider>
        </InterviewSchedulingAutomationProvider>
      </ScreeningAutomationProvider>
    </DemoProvider>
  </StrictMode>,
)
