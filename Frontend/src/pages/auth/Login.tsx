import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logo from '../../assets/logo.png'
import { backendWorkspaceMode } from '../../config/workspaceMode'
import { login } from '../../services/backendRecruiterApi'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@aura.local')
  const [password, setPassword] = useState('AuraDemo123!')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await login(email, password)
      navigate('/candidates')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-frost px-5 py-8">
      <section className="w-full max-w-[570px] rounded-aura-lg border border-harbor/15 bg-white p-8 text-center shadow-aura-md">
        <img src={logo} alt="AURA Logo" className="mx-auto mb-5 h-9 w-auto object-contain" />
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-marine">
          AURA AI
        </p>
        <h1 className="m-0 text-[26px] font-bold leading-tight text-depth">
          Hiring workspace
        </h1>
        <p className="mt-3 mb-0 text-sm leading-6 text-aura-text-secondary">
          {backendWorkspaceMode ? 'Sign in to view real backend screening runs.' : 'Continue to the recruitment operations workspace.'}
        </p>
        {backendWorkspaceMode ? (
          <form className="mt-6 grid gap-3 text-left" onSubmit={submit}>
            <label className="grid gap-1.5 text-sm font-semibold text-depth">Email<input className="h-11 rounded-aura-sm border border-harbor/20 px-3 text-sm" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-depth">Password<input className="h-11 rounded-aura-sm border border-harbor/20 px-3 text-sm" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {error ? <p className="m-0 rounded-aura-sm bg-aura-danger-soft px-3 py-2 text-sm text-aura-danger" role="alert">{error}</p> : null}
            <button className="mt-2 inline-flex h-10 items-center justify-center rounded-aura-sm border border-[#C7FF38] bg-[#C7FF38] px-4 text-sm font-semibold text-[#171717] shadow-[0_0_10px_rgba(199,255,56,0.35)] transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} type="submit">{submitting ? 'Signing in...' : 'Sign in'}</button>
          </form>
        ) : (
          <Link
            className="mt-6 inline-flex h-10 items-center justify-center rounded-aura-sm border border-[#72a3bf] bg-[#72a3bf] px-4 text-sm font-semibold text-[#1D4052] no-underline transition-all shadow-[0_0_10px_rgba(114,163,191,0.45)] hover:bg-[#5b8da8] hover:shadow-[0_0_16px_rgba(114,163,191,0.65)] duration-150"
            to="/jobs"
          >
            Open job workspace
          </Link>
        )}
      </section>
    </main>
  )
}
