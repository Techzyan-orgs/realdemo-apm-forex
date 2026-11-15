"use client";
import * as T from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/format";

type ToastItem = { id: number; title: string; description?: string; tone?: "success" | "danger" | "neutral" };
const Ctx = createContext<(t: Omit<ToastItem, "id">) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((t: Omit<ToastItem, "id">) => setItems((s) => [...s, { ...t, id: Date.now() + Math.random() }]), []);
  return (
    <Ctx.Provider value={push}>
      <T.Provider swipeDirection="right" duration={4000}>
        {children}
        {items.map((t) => (
          <T.Root
            key={t.id}
            onOpenChange={(o) => !o && setItems((s) => s.filter((x) => x.id !== t.id))}
            className={cn(
              "rounded-xl border bg-surface p-4 shadow-lg",
              t.tone === "success" && "border-success/30",
              t.tone === "danger" && "border-danger/30",
              (!t.tone || t.tone === "neutral") && "border-line",
            )}
          >
            <T.Title className="text-sm font-semibold text-ink">{t.title}</T.Title>
            {t.description && <T.Description className="mt-1 text-sm text-ink-muted">{t.description}</T.Description>}
          </T.Root>
        ))}
        <T.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </T.Provider>
    </Ctx.Provider>
  );
}
