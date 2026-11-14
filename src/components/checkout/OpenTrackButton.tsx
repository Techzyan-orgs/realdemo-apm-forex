"use client";
import { Button } from "@/components/ui/Button";
import { useUi } from "@/stores/ui";

export function OpenTrackButton({ label = "Track your order" }: { label?: string }) {
  const openTrack = useUi((s) => s.openTrack);
  return <Button onClick={openTrack}>{label}</Button>;
}
