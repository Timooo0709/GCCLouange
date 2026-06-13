"use client";

import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import { useDefaultSensors } from "@/lib/dnd/sensors";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, GripVertical, Plus, Trash2, RotateCcw } from "lucide-react";
import type { ChordProSection } from "@/types/chordPro";
import { useTranslation } from "react-i18next";
import { formatSectionName } from "@/lib/chordpro/parser";
import { BugReportButton } from "@/components/layout/AlertButton";
import type { SectionItem } from "@/types/song";

// --- Types ---


export interface CustomizeState {
  semitones: number;
  currentKey: string;
  showChords: boolean;
  showPinyin: boolean;
  useJianpu: boolean;
  structure: SectionItem[];
}

interface CustomizePanelProps {
  originalKey: string;
  isZh: boolean;
  hasJianpu: boolean;
  sections: ChordProSection[];
  state: CustomizeState;
  onChange: (s: CustomizeState) => void;
  onClose: () => void;
  songTitle: string;
}

// --- Sortable row ---

function SortableRow({
  item,
  section,
  onRemove,
  onNoteChange,
}: {
  item: SectionItem;
  section?: ChordProSection;
  onRemove: () => void;
  onNoteChange: (note: string) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.uid });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-start gap-2 p-2 rounded border ${
        isDragging
          ? "border-primary/50 bg-primary/5 shadow-lg"
          : "border-border bg-background"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing shrink-0"
        style={{ touchAction: "none" }}
        aria-label={t("setlists.form.reorderLabel")}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground text-ellipsis overflow-hidden whitespace-nowrap">
          {section ? formatSectionName(section, t) : item.name}
        </div>
        <input
          type="text"
          placeholder={t("setlists.form.songNotePlaceholder")}
          value={item.note}
          onChange={(e) => onNoteChange(e.target.value)}
          className="mt-1 w-full text-xs px-2 py-1 border border-border rounded bg-muted/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      <button
        onClick={onRemove}
        className="mt-0.5 text-muted-foreground hover:text-destructive shrink-0"
        aria-label={t("setlists.form.removeLabel")}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// --- Panel principal ---

export function CustomizePanel({
  originalKey,
  isZh,
  sections,
  state,
  onChange,
  onClose,
  songTitle,
}: CustomizePanelProps) {
  const { t } = useTranslation();

  const sensors = useDefaultSensors();

  
  function update(patch: Partial<CustomizeState>) {
    onChange({ ...state, ...patch });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = state.structure.findIndex((s) => s.uid === active.id);
    const newIdx = state.structure.findIndex((s) => s.uid === over.id);
    update({ structure: arrayMove(state.structure, oldIdx, newIdx) });
  }

  function addSection(section: ChordProSection) {
    const uid = `${section.id}-${Date.now()}${Math.floor(Math.random() * 1000)}`;
    update({
      structure: [
        ...state.structure,
        { uid, sectionId: section.id, name: section.name || section.type, note: "" },
      ],
    });
  }

  function removeAt(index: number) {
    update({ structure: state.structure.filter((_, i) => i !== index) });
  }

  function updateNote(index: number, note: string) {
    const next = [...state.structure];
    next[index] = { ...next[index], note };
    update({ structure: next });
  }

  function reset() {
    onChange({
      semitones: 0,
      currentKey: originalKey,
      showChords: true,
      showPinyin: isZh,
      useJianpu: false,
      structure: sections.map((s, i) => ({
        uid: `${s.id}-${i}`,
        sectionId: s.id,
        name: s.name || s.type,
        note: "",
      })),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-sm h-full bg-background border-l border-border flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="font-semibold text-foreground">{t("customize.panel.title")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">

          
          {/* --- Structure --- */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              {t("customize.panel.structure")}
            </h3>

            {/* Sections disponibles à ajouter */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => addSection(s)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-muted text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  {formatSectionName(s, t)}
                </button>
              ))}
            </div>

            {/* Liste drag & drop */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={state.structure.map((s) => s.uid)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {state.structure.map((item, i) => {
                    const section = sections.find((s) => s.id === item.sectionId);
                    return (
                      <SortableRow
                        key={item.uid}
                        item={item}
                        section={section}
                        onRemove={() => removeAt(i)}
                        onNoteChange={(note) => updateNote(i, note)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {state.structure.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t("customize.panel.emptySections")}
              </p>
            )}
          </section>

          {/* --- Signalement --- */}
          <section>
            <BugReportButton song={songTitle} />
          </section>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-3 border-t border-border flex gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            {t("common.buttons.reset")}
          </button>
          <button
            onClick={onClose}
            className="ml-auto px-4 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t("common.buttons.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
