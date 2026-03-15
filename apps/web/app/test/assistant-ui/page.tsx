import { FeatureSection } from "@/components/test/assistant-ui/feature-section";
import { Button } from "@/components/ui/glass/button"
import Link from "next/link";

export default function AssistantUiHomePage() {
  return (
    <section className="min-h-screen place-content-center p-4 items-center justify-center text-center">
      <FeatureSection />
      <div className="flex flex-wrap gap-2 justify-center mt-12">
        <Link href="/test/assistant-ui/g">
          <Button>Debug Mode (g)</Button>
        </Link>
        <Link href="/test/assistant-ui/u">
          <Button variant="outline">Simple Mode (u)</Button>
        </Link>
      </div>
    </section>
  );
}
