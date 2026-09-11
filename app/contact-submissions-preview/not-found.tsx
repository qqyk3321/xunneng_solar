import Link from "next/link";
export default function NotFound() {
  return (
    <section>
      <h1>Submission not found</h1>
      <p>This preview link is invalid or the record is no longer available.</p>
      <Link href="/contact-submissions-preview">Back to submissions</Link>
    </section>
  );
}
