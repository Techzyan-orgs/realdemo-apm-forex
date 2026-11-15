import { CurrencyCalculator } from "@/components/calculator/CurrencyCalculator";
import { CallbackModal } from "@/components/forms/CallbackModal";
import { TrackOrderModal } from "@/components/forms/TrackOrderModal";
import { FloatingActions } from "@/components/layout/FloatingActions";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ToastProvider } from "@/components/ui/Toast";

/** Public site shell. The calculator and modals are mounted once here and opened via the zustand ui store. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Header />
      <div id="main">{children}</div>
      <Footer />
      <FloatingActions />
      <CurrencyCalculator />
      <CallbackModal />
      <TrackOrderModal />
    </ToastProvider>
  );
}
