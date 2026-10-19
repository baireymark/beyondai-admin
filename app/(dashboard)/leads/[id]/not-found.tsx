import Link from 'next/link';

export default function LeadNotFound() {
  return (
    <main id="main" className="px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-semibold">Enquiry not found</h1>
      <p className="mt-2 text-fg-muted">It may have been deleted, or the link is wrong.</p>
      <Link href="/leads" className="mt-6 inline-block text-primary underline">
        Back to enquiries
      </Link>
    </main>
  );
}
