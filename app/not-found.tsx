import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-fg-muted">The page you are looking for does not exist.</p>
      <Link href="/" className="mt-6 inline-block text-primary underline">
        Back to the overview
      </Link>
    </main>
  );
}
