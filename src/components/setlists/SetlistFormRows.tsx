"use client";

import { useState } from "react";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Link2,
  Unlink,
  Shuffle,
  RotateCcw,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { ALL_KEYS } from "@/lib/transpose";
import { useTranslation } from "react-i18next";
import { useDefaultSensors } from "@/lib/dnd/sensors";
import { nextUid } from "@/lib/uid";
import type { FormItem, FormSectionItem, FormFusionItem, FormTransitionItem, FusionMixedSectionForm } from "@/lib/setlist/formItems";
import type { SectionSummary } from "@/types/song";

// ─── Champs note / transition repliables ─────────────────────────────────────

type AnnotationField = "note" | "transition" | null;

function FieldToggleBtn({
  kind,
  filled,
  active,
  onClick,
}: {
  kind: "note" | "transition";
  filled: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = kind === "note" ? MessageSquare : ArrowRight;
  const filledClass =
    kind === "note"
      ? "bg-primary/10 text-primary"
      : "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  const activeRing = kind === "note" ? "ring-1 ring-primary/40" : "ring-1 ring-amber-400/50";
  return (
    <button
      type="button"
      title={kind === "note" ? "Note" : "Transition"}
      onClick={onClick}
      className={`h-7 w-7 flex items-center justify-center rounded-md shrink-0 transition-colors ${
        filled ? filledClass : "text-muted-foreground/50 hover:text-foreground hover:bg-muted"
      } ${active ? activeRing : ""}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function AnnotationFieldInput({
  kind,
  value,
  onChange,
  onClose,
}: {
  kind: "note" | "transition";
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isNote = kind === "note";
  return (
    <div className="px-2 pb-1.5 pl-7">
      <input
        autoFocus
        type="text"
        placeholder={
          isNote
            ? t("setlists.form.songNotePlaceholder")
            : t("setlists.form.transitionPlaceholder", { defaultValue: "Transition après cette section…" })
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
        className={
          isNote
            ? "w-full text-[11px] px-1.5 py-1 border border-border rounded bg-muted/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
            : "w-full text-[11px] px-1.5 py-1 border border-dashed border-amber-300/80 dark:border-amber-700/60 rounded bg-amber-50/50 dark:bg-amber-950/10 text-foreground placeholder:text-amber-400/70 dark:placeholder:text-amber-600/60 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
        }
      />
    </div>
  );
}

// ─── Section row (sortable, inside a song) ────────────────────────────────────

export function SortableSectionRow({
  item,
  onRemove,
  onNoteChange,
  onTransitionChange,
  hideNote,
}: {
  item: FormSectionItem;
  onRemove: () => void;
  onNoteChange: (note: string) => void;
  onTransitionChange?: (transition: string) => void;
  hideNote?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.uid });
  const [expanded, setExpanded] = useState<AnnotationField>(null);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded border text-xs ${
        isDragging ? "border-primary/40 bg-primary/5 shadow" : "border-border bg-background"
      }`}
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          {...attributes}
          {...listeners}
          type="button"
          style={{ touchAction: "none" }}
          className="h-7 w-6 flex items-center justify-center -ml-1 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="flex-1 min-w-0 font-medium text-foreground truncate">{item.name}</span>
        {!hideNote && (
          <>
            <FieldToggleBtn
              kind="note"
              filled={!!item.note.trim()}
              active={expanded === "note"}
              onClick={() => setExpanded(expanded === "note" ? null : "note")}
            />
            <FieldToggleBtn
              kind="transition"
              filled={!!(item.transition ?? "").trim()}
              active={expanded === "transition"}
              onClick={() => setExpanded(expanded === "transition" ? null : "transition")}
            />
          </>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {!hideNote && expanded === "note" && (
        <AnnotationFieldInput
          kind="note"
          value={item.note}
          onChange={onNoteChange}
          onClose={() => setExpanded(null)}
        />
      )}
      {!hideNote && expanded === "transition" && (
        <AnnotationFieldInput
          kind="transition"
          value={item.transition ?? ""}
          onChange={(v) => onTransitionChange?.(v)}
          onClose={() => setExpanded(null)}
        />
      )}
    </div>
  );
}

// ─── Structure editor ─────────────────────────────────────────────────────────

export function SectionStructureEditor({
  allSections,
  sectionItems,
  onChange,
  hideNotes,
}: {
  allSections: SectionSummary[];
  sectionItems: FormSectionItem[];
  onChange: (items: FormSectionItem[]) => void;
  hideNotes?: boolean;
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

  return (
    <div className="border-t border-border pt-2 px-3 pb-2 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {t("setlists.form.structure")}
      </p>
      <div className="flex flex-wrap gap-1">
        {allSections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              const uid = `${s.id}-${Date.now()}${Math.floor(Math.random() * 1000)}`;
              onChange([
                ...sectionItems,
                { uid, sectionId: s.id, name: s.name, note: "", transition: "" },
              ]);
            }}
            className="flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded border border-border hover:bg-muted text-foreground transition-colors"
          >
            <Plus className="h-2.5 w-2.5" />
            {s.name}
          </button>
        ))}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sectionItems.map((s) => s.uid)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {sectionItems.map((item, idx) => (
              <SortableSectionRow
                key={item.uid}
                item={item}
                onRemove={() => onChange(sectionItems.filter((_, i) => i !== idx))}
                onNoteChange={(note) => {
                  const next = [...sectionItems];
                  next[idx] = { ...next[idx], note };
                  onChange(next);
                }}
                onTransitionChange={(transition) => {
                  const next = [...sectionItems];
                  next[idx] = { ...next[idx], transition };
                  onChange(next);
                }}
                hideNote={hideNotes}
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

// ─── Mixed structure: sortable section row ────────────────────────────────────

function SortableMixedRow({
  item,
  onRemove,
  onNoteChange,
  onTransitionChange,
}: {
  item: FusionMixedSectionForm;
  onRemove: () => void;
  onNoteChange: (note: string) => void;
  onTransitionChange: (transition: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.uid });
  const [expanded, setExpanded] = useState<AnnotationField>(null);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition}}
      className={`rounded border text-xs ${
        isDragging ? "border-primary/40 bg-primary/5 shadow" : "border-border bg-background"
      }`}
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          {...attributes}
          {...listeners}
          type="button"
          style={{touchAction: "none"}}
          className="h-7 w-6 flex items-center justify-center -ml-1 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="font-medium text-foreground truncate">{item.sectionName}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium truncate max-w-[100px] shrink-0">
            {item.songTitle}
          </span>
        </div>
        <FieldToggleBtn
          kind="note"
          filled={!!item.note.trim()}
          active={expanded === "note"}
          onClick={() => setExpanded(expanded === "note" ? null : "note")}
        />
        <FieldToggleBtn
          kind="transition"
          filled={!!(item.transition ?? "").trim()}
          active={expanded === "transition"}
          onClick={() => setExpanded(expanded === "transition" ? null : "transition")}
        />
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {expanded === "note" && (
        <AnnotationFieldInput
          kind="note"
          value={item.note}
          onChange={onNoteChange}
          onClose={() => setExpanded(null)}
        />
      )}
      {expanded === "transition" && (
        <AnnotationFieldInput
          kind="transition"
          value={item.transition ?? ""}
          onChange={onTransitionChange}
          onClose={() => setExpanded(null)}
        />
      )}
    </div>
  );
}

// ─── Mixed structure editor ───────────────────────────────────────────────────

function MixedStructureEditor({
  fusionItem,
  onChangeMixed,
}: {
  fusionItem: FormFusionItem;
  onChangeMixed: (mixed: FusionMixedSectionForm[] | null) => void;
}) {
  const { t } = useTranslation();
  const sensors = useDefaultSensors();
  const mixed = fusionItem.mixedStructure!;

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = mixed.findIndex((m) => m.uid === active.id);
    const newIdx = mixed.findIndex((m) => m.uid === over.id);
    onChangeMixed(arrayMove(mixed, oldIdx, newIdx));
  }

  function addSection(song: FormItem, si: FormSectionItem) {
    onChangeMixed([
      ...mixed,
      {
        uid: nextUid(),
        songSlug: song.song.slug,
        sectionId: si.sectionId,
        sectionName: si.name,
        songTitle: song.song.title,
        note: si.note,
        transition: si.transition ?? "",
      },
    ]);
  }

  return (
    <div className="border-t border-primary/20 pt-3 px-3 pb-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-primary font-medium">
          {t("setlists.form.mixedStructureTitle")}
        </p>
        <button
          type="button"
          onClick={() => onChangeMixed(null)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          {t("setlists.form.mixedStructureReset")}
        </button>
      </div>

      {/* Boutons d'ajout par chant */}
      <div className="space-y-2">
        {fusionItem.songs.map((song) => (
          <div key={song.uid}>
            <p className="text-[10px] text-muted-foreground mb-1 truncate">
              {song.song.title}
            </p>
            <div className="flex flex-wrap gap-1">
              {song.sectionItems.map((si) => (
                <button
                  key={si.uid}
                  type="button"
                  onClick={() => addSection(song, si)}
                  className="flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded border border-border hover:bg-muted text-foreground transition-colors"
                >
                  <Plus className="h-2.5 w-2.5" />
                  {si.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Liste drag & drop */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={mixed.map((m) => m.uid)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {mixed.map((ms, idx) => (
              <SortableMixedRow
                key={ms.uid}
                item={ms}
                onRemove={() => onChangeMixed(mixed.filter((_, i) => i !== idx))}
                onNoteChange={(note) => {
                  const next = [...mixed];
                  next[idx] = { ...next[idx], note };
                  onChangeMixed(next);
                }}
                onTransitionChange={(transition) => {
                  const next = [...mixed];
                  next[idx] = { ...next[idx], transition };
                  onChangeMixed(next);
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {mixed.length === 0 && (
        <p className="text-[11px] text-muted-foreground text-center py-1">
          {t("setlists.form.mixedStructureEmpty")}
        </p>
      )}
    </div>
  );
}

// ─── Song row (sortable, top-level) ───────────────────────────────────────────

export function SongRow({
  item,
  selectable,
  selected,
  onToggleSelect,
  onRemove,
  onKeyChange,
  onNoteChange,
  onSectionItemsChange,
}: {
  item: FormItem;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
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
  const isModified =
    currentCount !== originalCount ||
    item.sectionItems.some((si, i) => si.sectionId !== allSections[i]?.id);
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition}}
      className={`rounded-lg border transition-colors ${
        isDragging
          ? "border-primary/50 bg-primary/5 shadow-md"
          : selected
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-background"
      }`}
    >
      <div className="flex items-start gap-2 p-3">
        {selectable ? (
          <button
            type="button"
            onClick={onToggleSelect}
            className={`mt-0.5 shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              selected
                ? "border-primary bg-primary"
                : "border-muted-foreground/40 hover:border-primary"
            }`}
          >
            {selected && (
              <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5 3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        ) : (
          <button
            {...attributes}
            {...listeners}
            type="button"
            style={{touchAction: "none"}}
            className="mt-0.5 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate">{item.song.title}</span>
            {item.song.titlePinyin && (
              <span className="text-xs text-muted-foreground">{item.song.titlePinyin}</span>
            )}
            {item.song.language === "zh" && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                {t("common.languages.zh")}
              </span>
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

        {!selectable && (
          <button
            type="button"
            onClick={onRemove}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

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

// ─── Song card inside a fusion (not sortable at top level) ────────────────────

function FusionSongCard({
  item,
  onKeyChange,
  onSectionItemsChange,
  hasMixed,
}: {
  item: FormItem;
  onKeyChange: (key: string | null) => void;
  onSectionItemsChange: (items: FormSectionItem[]) => void;
  hasMixed?: boolean;
}) {
  const { t } = useTranslation();
  const [showStructure, setShowStructure] = useState(false);
  const allSections = item.song.sections ?? [];
  const originalCount = allSections.length;
  const currentCount = item.sectionItems.length;
  const isModified =
    currentCount !== originalCount ||
    item.sectionItems.some((si, i) => si.sectionId !== allSections[i]?.id);

  return (
    <div className="bg-background rounded border border-border">
      <div className="flex items-start gap-2 p-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-foreground truncate">{item.song.title}</span>
            {item.song.titlePinyin && (
              <span className="text-[10px] text-muted-foreground">{item.song.titlePinyin}</span>
            )}
          </div>
          {item.song.artist && (
            <p className="text-[10px] text-muted-foreground">{item.song.artist}</p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <select
            value={item.keyOverride ?? ""}
            onChange={(e) => onKeyChange(e.target.value || null)}
            className="text-xs px-1.5 py-0.5 border border-border rounded bg-background text-foreground font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="">{t("setlists.form.songOriginalKey", { key: item.song.originalKey })}</option>
            {ALL_KEYS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          {!hasMixed && originalCount > 1 && (
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
      </div>

      {/* Notes par section et structure — masqués si structure mélangée active */}
      {!hasMixed && item.sectionItems.length > 0 && (
        <div className="border-t border-border px-2.5 pb-2 pt-1.5 space-y-1">
          {item.sectionItems.map((si, idx) => (
            <div key={si.uid} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-20 shrink-0 truncate">{si.name}</span>
              <input
                type="text"
                placeholder={t("setlists.form.songNotePlaceholder")}
                value={si.note}
                onChange={(e) => {
                  const next = [...item.sectionItems];
                  next[idx] = { ...next[idx], note: e.target.value };
                  onSectionItemsChange(next);
                }}
                className="flex-1 text-[11px] px-1.5 py-0.5 border border-border rounded bg-muted/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          ))}
        </div>
      )}

      {!hasMixed && showStructure && originalCount > 1 && (
        <SectionStructureEditor
          allSections={allSections}
          sectionItems={item.sectionItems}
          onChange={onSectionItemsChange}
          hideNotes
        />
      )}
    </div>
  );
}

// ─── Fusion row (sortable, top-level) ─────────────────────────────────────────

export function FusionRow({
  item,
  onUnfuse,
  onRemove,
  onPatchSong,
  onChangeMixed,
}: {
  item: FormFusionItem;
  onUnfuse: () => void;
  onRemove: () => void;
  onPatchSong: (songUid: string, update: Partial<FormItem>) => void;
  onChangeMixed: (mixed: FusionMixedSectionForm[] | null) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.uid });

  const [expanded, setExpanded] = useState(false);
  const fusionTitle = item.songs.map((s) => s.song.title).join(" / ");

  function toggleMixed() {
    if (item.mixedStructure !== null) {
      // Désactiver : remettre à null
      onChangeMixed(null);
    } else {
      // Activer : initialiser avec l'ordre par défaut
      const defaultMixed: FusionMixedSectionForm[] = item.songs.flatMap((song) =>
        song.sectionItems.map((si) => ({
          uid: nextUid(),
          songSlug: song.song.slug,
          sectionId: si.sectionId,
          sectionName: si.name,
          songTitle: song.song.title,
          note: si.note,
          transition: si.transition ?? "",
        }))
      );
      onChangeMixed(defaultMixed);
    }
  }

  const hasMixed = item.mixedStructure !== null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition}}
      className={`rounded-lg border-2 ${
        isDragging
          ? "border-primary/60 bg-primary/5 shadow-md"
          : "border-primary/25 bg-primary/3"
      }`}
    >
      {/* En-tête de la fusion */}
      <div className="flex items-center gap-2 p-3">
        <button
          {...attributes}
          {...listeners}
          type="button"
          style={{touchAction: 'none'}}
          className="text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />

        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate block">{fusionTitle}</span>
          <span className="text-[10px] uppercase tracking-wider text-primary font-medium">
            {t("setlists.form.fusionLabel")}
          </span>
        </div>

        {/* Bouton structure mélangée */}
        <button
          type="button"
          onClick={toggleMixed}
          title={t("setlists.form.mixedStructureToggle")}
          className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
            hasMixed
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shuffle className="h-2.5 w-2.5" />
          {t("setlists.form.mixedStructureLabel")}
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {t("setlists.form.fusionExpand")}
        </button>

        <button
          type="button"
          onClick={onUnfuse}
          title={t("setlists.form.unfuseButton")}
          className="text-muted-foreground hover:text-primary transition-colors shrink-0"
        >
          <Unlink className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Éditeur de structure mélangée */}
      {hasMixed && (
        <MixedStructureEditor fusionItem={item} onChangeMixed={onChangeMixed} />
      )}

      {/* Chants de la fusion (dépliés) */}
      {expanded && (
        <div className="border-t border-primary/20 px-3 pb-3 pt-2 space-y-2">
          {item.songs.map((song) => (
            <FusionSongCard
              key={song.uid}
              item={song}
              onKeyChange={(key) => onPatchSong(song.uid, { keyOverride: key })}
              onSectionItemsChange={(sectionItems) => onPatchSong(song.uid, { sectionItems })}
              hasMixed={item.mixedStructure !== null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Transition row ───────────────────────────────────────────────────────────

export function TransitionRow({ item, onTextChange, onRemove }: {
  item: FormTransitionItem;
  onTextChange: (text: string) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.uid });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20"
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" {...attributes} {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground touch-none">
          <GripVertical className="h-4 w-4" />
        </button>

        <MessageSquare className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 flex-1">
          {t("setlists.form.transitionLabel", { defaultValue: "Transition" })}
        </span>

        {/* Preview when collapsed */}
        {!expanded && item.text && (
          <span className="text-xs text-muted-foreground italic truncate max-w-[160px]">{item.text}</span>
        )}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground p-0.5"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive p-0.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Textarea */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-amber-200 dark:border-amber-800 pt-2">
          <textarea
            value={item.text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={4}
            placeholder={t("setlists.form.transitionPlaceholder", { defaultValue: "Texte de transition du président de séance…" })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/30 text-sm resize-none"
          />
        </div>
      )}
    </div>
  );
}
