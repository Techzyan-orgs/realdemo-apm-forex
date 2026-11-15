"use client";
import { CallbackForm } from "@/components/forms/CallbackForm";
import { Modal } from "@/components/ui/Modal";
import { useUi } from "@/stores/ui";

/** Request a Call modal (header, floating action, cap-exceeded link). */
export function CallbackModal() {
  const open = useUi((s) => s.callbackOpen);
  const prefill = useUi((s) => s.callbackPrefill);
  const close = useUi((s) => s.closeCallback);
  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && close()}
      title="Request a call back"
      description="Share your number and we'll call you during store hours."
      size="sm"
      mobileSheet={false}
    >
      {open && (
        <CallbackForm
          key={prefill?.note ?? "cb"}
          className="p-5"
          source={prefill?.source ?? "CALLBACK"}
          defaultNote={prefill?.note ?? ""}
          onDone={close}
        />
      )}
    </Modal>
  );
}
