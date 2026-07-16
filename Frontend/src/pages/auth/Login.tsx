import { Link } from 'react-router-dom'
import logo from '../../assets/logo.png'

export default function Login() {
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
          Continue to the recruitment operations workspace.
        </p>
        <Link
          className="mt-6 inline-flex h-10 items-center justify-center rounded-aura-sm border border-[#72a3bf] bg-[#72a3bf] px-4 text-sm font-semibold text-[#1D4052] no-underline transition-all shadow-[0_0_10px_rgba(114,163,191,0.45)] hover:bg-[#5b8da8] hover:shadow-[0_0_16px_rgba(114,163,191,0.65)] duration-150"
          to="/jobs"
        >
          Open job workspace
        </Link>
      </section>
    </main>
  )
}
