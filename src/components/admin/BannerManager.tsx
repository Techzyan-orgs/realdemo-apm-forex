"use client";
/* eslint-disable @next/next/no-img-element -- admin thumbnails of uploaded/public banners */
import { useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/format";
import type { AdminBannerDTO } from "@/lib/adminBanners";

export function BannerManager({ initial }: { initial: AdminBannerDTO[] }) {
  const toast = useToast();
  const [banners, setBanners] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<AdminBannerDTO | null>(null);
  const [editing, setEditing] = useState<AdminBannerDTO | null>(null);
  const [announce, setAnnounce] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const activeCount = banners.filter((b) => b.active).length;

  async function persistOrder(next: AdminBannerDTO[], prev: AdminBannerDTO[]) {
    const res = await fetch("/api/admin/banners/reorder", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: next.map((b) => b.id) }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBanners(prev);
      toast({ title: "Order not saved", description: body.error?.message, tone: "danger" });
      return;
    }
    setBanners(body.banners);
    toast({ title: "Banner order saved", tone: "success" });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const prev = banners;
    const from = prev.findIndex((b) => b.id === active.id);
    const to = prev.findIndex((b) => b.id === over.id);
    const next = arrayMove(prev, from, to).map((b, i) => ({ ...b, position: i }));
    setBanners(next); // optimistic
    setAnnounce(`Banner moved to position ${to + 1} of ${next.length}`);
    void persistOrder(next, prev);
  }

  async function toggle(b: AdminBannerDTO) {
    const res = await fetch(`/api/admin/banners/${b.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !b.active }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok)
      return toast({ title: "Not updated", description: body.error?.message, tone: "danger" });
    setBanners((s) => s.map((x) => (x.id === b.id ? { ...x, active: !b.active } : x)));
  }

  async function confirmDelete() {
    if (!deleting) return;
    const res = await fetch(`/api/admin/banners/${deleting.id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok)
      return toast({ title: "Not deleted", description: body.error?.message, tone: "danger" });
    setBanners((s) => s.filter((x) => x.id !== deleting.id).map((b, i) => ({ ...b, position: i })));
    toast({ title: "Banner deleted", tone: "success" });
    setDeleting(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <p className="text-sm text-ink-muted">
          Drag to reorder (or focus a handle, press Space, use the arrow keys, then Space again).
          The first active banner is the first hero slide.
        </p>
        <Button className="ml-auto" onClick={() => setAdding(true)}>
          <ImagePlus className="h-4 w-4" /> Add banner
        </Button>
      </div>
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
      <DndContext
        id="banner-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={banners.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <ol className="flex flex-col gap-2" data-testid="banner-list">
            {banners.map((b, i) => (
              <BannerRow
                key={b.id}
                banner={b}
                index={i}
                onToggle={() => toggle(b)}
                onEdit={() => setEditing(b)}
                onDelete={() => setDeleting(b)}
                lastActive={b.active && activeCount === 1}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      {adding && (
        <AddBannerDialog
          onClose={() => setAdding(false)}
          onAdded={(b) => {
            setBanners((s) => [...s, b]);
            setAdding(false);
            toast({
              title: "Banner added",
              description: "It appears last on the landing hero.",
              tone: "success",
            });
          }}
        />
      )}

      {editing && (
        <EditTextDialog
          banner={editing}
          onClose={() => setEditing(null)}
          onSaved={(b) => {
            setBanners((s) =>
              s.map((x) =>
                x.id === b.id ? { ...x, alt: b.alt, headline: b.headline, subline: b.subline } : x,
              ),
            );
            setEditing(null);
            toast({
              title: "Banner text saved",
              description: "The landing hero shows it on next load.",
              tone: "success",
            });
          }}
        />
      )}

      <Modal
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete banner?"
        description={deleting?.alt}
        size="sm"
        mobileSheet={false}
      >
        <div className="flex flex-col gap-4 p-5">
          {deleting && (
            <img
              src={deleting.imagePath}
              alt=""
              className="aspect-video w-full rounded-lg object-cover"
            />
          )}
          <p className="text-sm">This removes the banner from the landing page hero.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function BannerRow({
  banner: b,
  index,
  onToggle,
  onEdit,
  onDelete,
  lastActive,
}: {
  banner: AdminBannerDTO;
  index: number;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  lastActive: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: b.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-banner-id={b.id}
      data-alt={b.alt}
      className={cn(
        "flex items-center gap-4 rounded-xl border border-line bg-surface p-3",
        isDragging && "z-10 shadow-lg ring-2 ring-accent/30",
        !b.active && "opacity-60",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder banner ${index + 1}: ${b.alt}`}
        className="grid h-10 w-8 cursor-grab place-items-center rounded-lg text-ink-muted hover:bg-ink/5 active:cursor-grabbing"
        data-testid="drag-handle"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="w-6 text-center font-display text-lg font-semibold text-ink-muted num">
        {index + 1}
      </span>
      <img
        src={b.imagePath}
        alt=""
        className="aspect-video w-48 shrink-0 rounded-lg bg-bg object-cover"
      />
      <div className="min-w-0 flex-1">
        {b.headline ? (
          <p className="truncate font-display text-sm font-semibold" data-testid="banner-headline">
            {b.headline}
          </p>
        ) : (
          <p className="text-sm italic text-ink-muted">No headline (image only)</p>
        )}
        {b.subline && <p className="truncate text-xs text-ink-muted">{b.subline}</p>}
        <p className="mt-1 truncate text-[11px] text-ink-muted">Alt: {b.alt}</p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={onEdit}
        aria-label={`Edit text for banner ${index + 1}: ${b.alt}`}
      >
        <Pencil className="h-3.5 w-3.5" /> Edit text
      </Button>
      <label
        className="flex items-center gap-2 text-sm"
        title={lastActive ? "At least one banner must stay active" : undefined}
      >
        <input
          type="checkbox"
          checked={b.active}
          onChange={onToggle}
          disabled={lastActive}
          aria-label={`Active: ${b.alt}`}
        />
        Active
      </label>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={lastActive}
        aria-label={`Delete banner ${b.alt}`}
        title={lastActive ? "You can't delete the last active banner" : "Delete"}
      >
        <Trash2 className="h-4 w-4 text-danger" />
      </Button>
    </li>
  );
}

function AddBannerDialog({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (b: AdminBannerDTO) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dims, setDims] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [headline, setHeadline] = useState("");
  const [subline, setSubline] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function onFile(f: File | undefined) {
    setErrors({});
    setDims(null);
    if (!f) return setPreview(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
    const img = new Image();
    img.onload = () => setDims(`${img.naturalWidth}x${img.naturalHeight}`);
    img.src = url;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const f = fileRef.current?.files?.[0];
    if (!f) return setErrors({ file: "Choose an image" });
    setBusy(true);
    const fd = new FormData();
    fd.set("file", f);
    fd.set("alt", alt);
    fd.set("headline", headline);
    fd.set("subline", subline);
    const res = await fetch("/api/admin/banners", { method: "POST", body: fd });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok)
      return setErrors(body.error?.fields ?? { file: body.error?.message ?? "Upload failed" });
    onAdded({ ...body.banner });
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Add banner"
      description="JPG, PNG or WEBP · max 4 MB · exactly 16:9 · at least 1600x900"
      size="md"
      mobileSheet={false}
    >
      <form onSubmit={submit} className="flex flex-col gap-4 p-5">
        <Field
          label="Image"
          required
          error={errors.file}
          hint={dims ? `Selected image: ${dims}` : undefined}
        >
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              onChange={(e) => onFile(e.target.files?.[0])}
              className="text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-sm"
              data-testid="banner-file"
            />
          )}
        </Field>
        {preview && (
          <img src={preview} alt="" className="aspect-video w-full rounded-lg bg-bg object-cover" />
        )}
        <Field
          label="Alt text"
          required
          error={errors.alt}
          hint="Describe the image for screen readers."
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              required
              minLength={3}
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Headline" optional>
            {({ id }) => (
              <Input
                id={id}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={120}
              />
            )}
          </Field>
          <Field label="Sub-line" optional>
            {({ id }) => (
              <Input
                id={id}
                value={subline}
                onChange={(e) => setSubline(e.target.value)}
                maxLength={200}
              />
            )}
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Uploading…" : "Upload banner"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Edit the hero headline / supporting line (rendered as HTML over the image) and the alt text. */
function EditTextDialog({
  banner,
  onClose,
  onSaved,
}: {
  banner: AdminBannerDTO;
  onClose: () => void;
  onSaved: (b: AdminBannerDTO) => void;
}) {
  const [headline, setHeadline] = useState(banner.headline ?? "");
  const [subline, setSubline] = useState(banner.subline ?? "");
  const [alt, setAlt] = useState(banner.alt);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (alt.trim().length < 3) return setErrors({ alt: "Alt text needs at least 3 characters." });
    setSaving(true);
    const res = await fetch(`/api/admin/banners/${banner.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        alt: alt.trim(),
        headline: headline.trim() || null,
        subline: subline.trim() || null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok)
      return setErrors(body.error?.fields ?? { form: body.error?.message ?? "Could not save" });
    onSaved({
      ...banner,
      alt: body.banner.alt,
      headline: body.banner.headline,
      subline: body.banner.subline,
    });
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Edit banner text"
      description="Shown over the image on the landing page hero."
      size="lg"
    >
      <form onSubmit={save} className="flex flex-col gap-4 p-5" noValidate>
        {/* live preview, same treatment as the hero: dark left gradient + HTML text */}
        <div
          className="relative aspect-video w-full overflow-hidden rounded-xl bg-ink"
          aria-hidden="true"
        >
          <img
            src={banner.imagePath}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/45 to-transparent" />
          <div className="absolute inset-x-0 top-[30%] px-5 text-white">
            {headline.trim() && (
              <p className="max-w-[75%] font-display text-xl font-bold leading-tight tracking-tight sm:text-2xl">
                {headline}
              </p>
            )}
            {subline.trim() && (
              <p className="mt-2 max-w-[70%] text-xs text-white/85 sm:text-sm">{subline}</p>
            )}
          </div>
        </div>
        <Field
          label="Headline"
          optional
          hint={`${headline.length}/120 · leave empty for an image-only slide`}
          error={errors.headline}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={120}
            />
          )}
        </Field>
        <Field
          label="Supporting line"
          optional
          hint={`${subline.length}/200`}
          error={errors.subline}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={subline}
              onChange={(e) => setSubline(e.target.value)}
              maxLength={200}
            />
          )}
        </Field>
        <Field
          label="Alt text"
          required
          hint="Describes the image for screen readers."
          error={errors.alt}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              maxLength={200}
            />
          )}
        </Field>
        {errors.form && (
          <p className="text-sm text-danger" role="alert">
            {errors.form}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save text"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
