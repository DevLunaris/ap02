import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-5xl font-black tracking-tight text-ink-muted">404</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Diese Seite gibt es nicht.</h1>
      <p className="mt-2 text-ink-muted">
        Vielleicht ein Tippfehler im Slug – oder das Thema steht noch nicht im Themen-Index.
      </p>
      <Link
        href="/themen"
        className="mt-5 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Zu allen Themen
      </Link>
    </div>
  )
}
