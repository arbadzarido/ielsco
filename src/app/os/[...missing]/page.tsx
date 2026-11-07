import { notFound } from "next/navigation";

// Any /os path without a page renders the Company OS 404 (app/os/not-found.tsx), never a public page.
export default function MissingOsPage() {
  notFound();
}
