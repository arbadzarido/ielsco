import type { Metadata } from "next";
import Footer from "@/components/footer";
import SubmitStoryForm from "@/components/stories/SubmitStoryForm";

export const metadata: Metadata = {
  title: "Share your story | IELS Circle",
  description: "Tell us about your journey. Our team reviews every story before anything is published.",
  alternates: { canonical: "https://circle.ielsco.com/stories/submit" },
};

export default function SubmitStoryPage() {
  return (
    <div className="bg-[#F7F8FA] [&_:is(h1,h2,h3,h4,h5,h6)]:font-sans">
      <SubmitStoryForm />
      <Footer />
    </div>
  );
}
