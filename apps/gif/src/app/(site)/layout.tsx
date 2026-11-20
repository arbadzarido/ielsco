import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Analytics, CurrencyProvider } from "@/components/Client";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider initial="USD">
      <SiteHeader signedIn={false} />
      <main id="main">{children}</main>
      <SiteFooter />
      <Analytics />
    </CurrencyProvider>
  );
}
