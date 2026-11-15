import { Lock } from "lucide-react";
import { OpenTrackButton } from "./OpenTrackButton";

export function OrderAccessDenied() {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 pt-24">
      <div className="rounded-[20px] border border-line bg-surface p-8 text-center" data-testid="order-locked">
        <Lock className="mx-auto h-9 w-9 text-accent" />
        <h1 className="mt-4 font-display text-xl font-semibold">This order link has expired or is incomplete</h1>
        <p className="mt-2 text-sm text-ink-muted">For your privacy, enter your Order ID and mobile number to view your order.</p>
        <div className="mt-6">
          <OpenTrackButton />
        </div>
      </div>
    </main>
  );
}
