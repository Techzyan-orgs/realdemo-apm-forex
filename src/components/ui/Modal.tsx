"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/format";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** extra header controls (e.g. Back button) rendered before Close */
  headerActions?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** full-screen sheet under sm */
  mobileSheet?: boolean;
  className?: string;
  onEscapeKeyDown?: (e: KeyboardEvent) => void;
  onInteractOutside?: (e: Event) => void;
};

const sizes = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl" };

/** Accessible dialog (Radix): focus-trapped, Esc/backdrop close. */
export function Modal({ open, onOpenChange, title, description, children, headerActions, size = "md", mobileSheet = true, className, onEscapeKeyDown, onInteractOutside }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] data-[state=open]:animate-in" />
        <Dialog.Content
          onEscapeKeyDown={onEscapeKeyDown}
          onInteractOutside={onInteractOutside}
          className={cn(
            "fixed z-50 flex flex-col bg-surface shadow-[0_24px_64px_-24px_rgba(14,23,38,0.35)] focus:outline-none",
            mobileSheet
              ? "inset-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[20px] sm:border sm:border-line"
              : "left-1/2 top-1/2 max-h-[85vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-line",
            sizes[size],
            className,
          )}
        >
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-display text-lg font-semibold text-ink">{title}</Dialog.Title>
              {description && <Dialog.Description className="mt-0.5 text-sm text-ink-muted">{description}</Dialog.Description>}
            </div>
            {headerActions}
            <Dialog.Close className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-ink/5 hover:text-ink" aria-label="Close">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
