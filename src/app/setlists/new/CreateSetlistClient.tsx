"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Search, X, AlertTriangle, Plus, ChevronDown, ChevronUp } from "lucide-react";
import Fuse from "fuse.js";
import { ALL_KEYS } from "@/lib/transpose";
import {
  ALL_CATEGORIES,
  RESTRICTED_CATEGORIES,
  isRestricted,
  createSetlist,
} from "@/lib/firebase/setlists";
import { useAuth } from "@/lib/firebase/auth";
import { useTranslation } from "react-i18next";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {  type FormItem, type FormSectionItem, makeDefaultSections } from "@/lib/setlist/formItems";
import { useDefaultSensors } from "@/lib/dnd/sensors";
import { buildSetlistItems, detectSetlistLanguage } from "@/lib/setlist/buildSetlistItems";
import type { SongIndexEntry, SectionSummary } from "@/types/song";
import { nextUid } from "@/lib/uid";

// ─── Section row (sortable, inside a song) ────────────────────────────────────

function SortableSectionRow({
  item,
  onRemove,
  onNoteChange,
}: {
  item: FormSectionItem;
  onRemove: () => void;
  onNoteChange: (note: string) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.uid });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, touchAction: "none" }}
      className={`flex items-start gap-2 px-2 py-1.5 rounded border text-xs ${
        isDragging ? "border-primary/40 bg-primary/5 shadow" : "border-border bg-background"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="mt-0.5 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground">{item.name}</div>
        <input
          type="text"
          placeholder={t("setlists.form.songNotePlaceholder")}
          value={item.note}
          onChange={(e) => onNoteChange(e.target.value)}
          className="mt-1 w-full text-[11px] px-1.5 py-0.5 border border-border rounded bg-muted/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Structure editor ─────────────────────────────────────────────────────────

function SectionStructureEditor({
  allSections,
  sectionItems,
  onChange,
}: {
  allSections: SectionSummary[];
  sectionItems: FormSectionItem[];
  onChange: (items: FormSectionItem[]) => void;
}) {
  const { t } = useTranslation();
  const sensors = useDefaultSensors();

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = sectionItems.findIndex((s) => s.uid === active.id);
    const newIdx = sectionItems.findIndex((s) => s.uid === over.id);
    onChange(arrayMove(sectionItems, oldIdx, newIdx));
  }

  function addSection(section: SectionSummary) {
    onChange([...sectionItems, { uid: nextUid(), sectionId: section.id, name: section.name, note: "" }]);
  }

  function removeAt(idx: number) {
    onChange(sectionItems.filter((_, i) => i !== idx));
  }

  function updateNote(idx: number, note: string) {
    const next = [...sectionItems];
    next[idx] = { ...next[idx], note };
    onChange(next);
  }

  return (
    <div className="border-t border-border pt-2 px-3 pb-2 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("setlists.form.structure")}</p>

      {/* Boutons pour ajouter des sections */}
      <div className="flex flex-wrap gap-1">
        {allSections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => addSection(s)}
            className="flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded border border-border hover:bg-muted text-foreground transition-colors"
          >
            <Plus className="h-2.5 w-2.5" />
            {s.name}
          </button>
        ))}
      </div>

      {/* Liste drag & drop */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sectionItems.map((s) => s.uid)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {sectionItems.map((item, idx) => (
              <SortableSectionRow
                key={item.uid}
                item={item}
                onRemove={() => removeAt(idx)}
                onNoteChange={(note) => updateNote(idx, note)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {sectionItems.length === 0 && (
        <p className="text-[11px] text-muted-foreground text-center py-1">
          {t("setlists.form.emptySections")}
        </p>
      )}
    </div>
  );
}

// ─── Song row (sortable, top-level) ───────────────────────────────────────────

function SongRow({
  item,
  onRemove,
  onKeyChange,
  onNoteChange,
  onSectionItemsChange,
}: {
  item: FormItem;
  onRemove: () => void;
  onKeyChange: (key: string | null) => void;
  onNoteChange: (note: string) => void;
  onSectionItemsChange: (items: FormSectionItem[]) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.uid });

  const [showStructure, setShowStructure] = useState(false);
  const allSections = item.song.sections ?? [];
  const originalCount = allSections.length;
  const currentCount = item.sectionItems.length;
  const isModified = currentCount !== originalCount ||
    item.sectionItems.some((si, i) => si.sectionId !== allSections[i]?.id);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, touchAction: "none" }}
      className={`rounded-lg border ${
        isDragging ? "border-primary/50 bg-primary/5 shadow-md" : "border-border bg-background"
      }`}
    >
    
      {/* Ligne principale */}
      <div className="flex items-start gap-2 p-3">
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="mt-0.5 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate">{item.song.title}</span>
            {item.song.titlePinyin && (
              <span className="text-xs text-muted-foreground">{item.song.titlePinyin}</span>
            )}
            {item.song.language === "zh" && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">{t("common.languages.zh")}</span>
            )}
          </div>
          {item.song.artist && (
            <p className="text-xs text-muted-foreground">{item.song.artist}</p>
          )}
          <input
            type="text"
            placeholder={t("setlists.form.songNotePlaceholder")}
            value={item.notes}
            onChange={(e) => onNoteChange(e.target.value)}
            className="mt-1.5 w-full text-xs px-2 py-1 border border-border rounded bg-muted/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1.5">
          {/* Tonalité */}
          <select
            value={item.keyOverride ?? ""}
            onChange={(e) => onKeyChange(e.target.value || null)}
            className="text-xs px-1.5 py-1 border border-border rounded bg-background text-foreground font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="">{t("setlists.form.songOriginalKey", { key: item.song.originalKey })}</option>
            {ALL_KEYS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>

          {/* Toggle structure */}
          {originalCount > 1 && (
            <button
              type="button"
              onClick={() => setShowStructure((v) => !v)}
              className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                isModified
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {showStructure ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
              {t("setlists.form.structure")}
              {isModified && ` ${currentCount}/${originalCount}`}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Éditeur de structure */}
      {showStructure && originalCount > 1 && (
        <SectionStructureEditor
          allSections={allSections}
          sectionItems={item.sectionItems}
          onChange={onSectionItemsChange}
        />
      )}
    </div>
  );
}

// ─── Main form ─────────────────────────────────────────────────────────────────

export function CreateSetlistClient() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [songs, setSongs] = useState<SongIndexEntry[]>([]);
  const [title, setTitle] = useState("");
  const [leader, setLeader] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormItem[]>([]);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/songs-index.json")
      .then((r) => r.json())
      .then((data) => setSongs(data.songs ?? []));
  }, []);

  const addedSlugs = useMemo(() => new Set(items.map((i) => i.song.slug)), [items]);
  const availableSongs = useMemo(() => songs.filter((s) => !addedSlugs.has(s.slug)), [songs, addedSlugs]);
  const fuse = useMemo(
    () => new Fuse(availableSongs, { keys: ["title", "titlePinyin", "artist"], threshold: 0.4 }),
    [availableSongs]
  );
  const searchResults = useMemo(
    () => query.trim() ? fuse.search(query.trim()).map((r) => r.item).slice(0, 6) : availableSongs.slice(0, 6),
    [query, fuse, availableSongs]
  );

  const sensors = useDefaultSensors();

  function addSong(song: SongIndexEntry) {
    setItems((prev) => [
      ...prev,
      {
        uid: nextUid(),
        song,
        keyOverride: null,
        notes: "",
        sectionItems: makeDefaultSections(song.sections ?? []),
      },
    ]);
    setQuery("");
  }

  function patch(uid: string, update: Partial<FormItem>) {
    setItems((prev) => prev.map((i) => (i.uid === uid ? { ...i, ...update } : i)));
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.uid === active.id);
    const newIdx = items.findIndex((i) => i.uid === over.id);
    setItems(arrayMove(items, oldIdx, newIdx));
  }

  async function doCreate(isDraft: boolean) {
    setError("");
    if (!title.trim()) { setError(t("setlists.form.titleRequired")); return; }
    if (!leader.trim()) { setError(t("setlists.form.leaderRequired")); return; }
    if (!category) { setError(t("setlists.form.categoryRequired")); return; }
    if (isRestricted(category) && !user) {
      router.push(`/login?from=/setlists/new`);
      return;
    }

    isDraft ? setDraftSaving(true) : setCreating(true);
    try {
      const setlistItems = buildSetlistItems(items);

      const language = detectSetlistLanguage(items);

      const id = await createSetlist({
        title: title.trim(),
        leader: leader.trim(),
        category,
        date: new Date().toISOString().split("T")[0],
        language,
        notes: notes.trim(),
        items: setlistItems,
        isDraft,
      });

      router.push(`/setlists/${id}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t("setlists.form.errorDefault"));
      isDraft ? setDraftSaving(false) : setCreating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await doCreate(false);
  }

  const busy = creating || draftSaving;
  const needsAuth = category && isRestricted(category) && !user && !authLoading;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-2 flex items-center gap-3">
        <a href="/setlists" className="text-sm text-muted-foreground hover:text-foreground">
          {t("setlists.detail.backToAll")}
        </a>
        <h1 className="font-semibold text-foreground">{t("setlists.form.titleNew")}</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {/* ── Info ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("setlists.form.infoSection")}
          </h2>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("setlists.form.titleLabel")} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("setlists.form.titlePlaceholder")}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("setlists.form.leaderLabel")} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={leader}
              onChange={(e) => setLeader(e.target.value)}
              placeholder={t("setlists.form.leaderPlaceholder")}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("setlists.form.categoryLabel")} <span className="text-destructive">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            >
              <option value="">{t("setlists.form.categoryPlaceholder")}</option>
              <optgroup label={t("setlists.form.categoryGroupRestricted")}>
                {RESTRICTED_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t("categories." + c, { defaultValue: c })}</option>
                ))}
              </optgroup>
              <optgroup label={t("setlists.form.categoryGroupFree")}>
                {["Groupe Paix", "Groupe Fidélité", "Groupe Bonté", "中班", "大班", "高班"].map((c) => (
                  <option key={c} value={c}>{t("categories." + c, { defaultValue: c })}</option>
                ))}
              </optgroup>
            </select>

            {needsAuth && (
              <div className="mt-2 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  {t("setlists.form.categoryRestrictedAuthWarning")}{" "}
                  <a href={`/login?from=/setlists/new`} className="underline font-medium">
                    {t("common.header.login")}
                  </a>
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("setlists.form.notesLabel")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={t("setlists.form.notesPlaceholder")}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none"
            />
          </div>
        </section>

        {/* ── Chants ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("common.header.songs")}
          </h2>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("setlists.form.searchSongsPlaceholder")}
              className="w-full pl-9 pr-8 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
              {searchResults.map((song) => (
                <button key={song.slug} type="button" onClick={() => addSong(song)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors">
                  <span className="text-sm font-medium text-foreground flex-1 truncate">{song.title}</span>
                  {song.language === "zh" && <span className="text-[10px] text-muted-foreground">{t("common.languages.zh")}</span>}
                  <span className="font-mono text-xs text-muted-foreground">{song.originalKey}</span>
                  <span className="text-primary text-xs font-medium">{t("common.buttons.add")}</span>
                </button>
              ))}
            </div>
          )}

          {songs.length > 0 && availableSongs.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              {t("setlists.form.allSongsAdded")}
            </p>
          )}

          {/* Liste drag & drop des chants */}
          {items.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((i) => i.uid)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map((item) => (
                    <SongRow
                      key={item.uid}
                      item={item}
                      onRemove={() => setItems((prev) => prev.filter((i) => i.uid !== item.uid))}
                      onKeyChange={(key) => patch(item.uid, { keyOverride: key })}
                      onNoteChange={(note) => patch(item.uid, { notes: note })}
                      onSectionItemsChange={(sectionItems) => patch(item.uid, { sectionItems })}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {items.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
              {t("setlists.form.emptySongs")}
            </p>
          )}
        </section>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex gap-2">
          {category && isRestricted(category) && (
            <button
              type="button"
              onClick={() => doCreate(true)}
              disabled={busy}
              className="flex-1 py-2.5 rounded-lg border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              {draftSaving ? t("setlists.form.draftSaving") : t("setlists.form.draftButton")}
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className={`py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 ${category && isRestricted(category) ? "flex-1" : "w-full"}`}
          >
            {creating ? t("setlists.form.creating") : t("setlists.form.createButton")}
          </button>
        </div>
      </form>
    </div>
  );
}
