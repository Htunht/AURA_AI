import { Link } from 'react-router-dom'

export default function Login() {
  return (
    <main className="grid min-h-screen place-items-center bg-frost px-5 py-8">
      <section className="w-full max-w-[570px] rounded-aura-lg border border-harbor/15 bg-white p-8 text-center shadow-aura-md">
        <span className="mx-auto mb-5 inline-grid size-9 place-items-center rounded-aura-sm bg-harbor text-sm font-bold text-frost">
          A
        </span>
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
          className="mt-6 inline-flex h-10 items-center justify-center rounded-aura-sm border border-harbor bg-harbor px-4 text-sm font-semibold text-frost no-underline transition-colors duration-150 hover:bg-depth"
          to="/jobs"
        >
          Open job workspace
        </Link>
      </section>
    </main>
  )
}
