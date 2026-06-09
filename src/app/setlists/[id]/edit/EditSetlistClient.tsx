"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Search, X, AlertTriangle, Link2 } from "lucide-react";
import Fuse from "fuse.js";
import {
  RESTRICTED_CATEGORIES,
  isRestricted,
  getSetlist,
  updateSetlist,
} from "@/lib/firebase/setlists";
import { useAuth } from "@/lib/firebase/auth";
import { useTranslation } from "react-i18next";
import type { SongIndexEntry } from "@/types/song";
import { nextUid } from "@/lib/uid";
import {
  type FormItem,
  type FormFusionItem,
  type FormTransitionItem,
  type FormListItem,
  type FusionMixedSectionForm,
  isFormFusion,
  isFormTransition,
  makeDefaultSections,
  buildFormItems,
} from "@/lib/setlist/formItems";
import { useDefaultSensors } from "@/lib/dnd/sensors";
import { buildSetlistItems, detectSetlistLanguage } from "@/lib/setlist/buildSetlistItems";
import { SongRow, FusionRow, TransitionRow } from "@/components/setlists/SetlistFormRows";

export function EditSetlistClient() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loadingData, setLoadingData] = useState(true);
  const [isDraft, setIsDraft] = useState(false);
  const [songs, setSongs] = useState<SongIndexEntry[]>([]);
  const [title, setTitle] = useState("");
  const [leader, setLeader] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormListItem[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      getSetlist(id),
      fetch("/songs-index.json").then((r) => r.json()),
    ]).then(([setlist, indexData]) => {
      if (!setlist) { router.push("/setlists"); return; }
      const songsMap: Record<string, SongIndexEntry> = {};
      for (const s of (indexData.songs ?? [])) songsMap[s.slug] = s;
      setSongs(indexData.songs ?? []);
      setTitle(setlist.title);
      setLeader(setlist.leader);
      setCategory(setlist.category);
      setNotes(setlist.notes);
      setIsDraft(setlist.isDraft ?? false);
      setItems(buildFormItems(setlist.items, songsMap));
    }).finally(() => setLoadingData(false));
  }, [id, router]);
  
  const addedSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const item of items) {
      if (isFormTransition(item)) continue;
      if (isFormFusion(item)) {
        for (const s of item.songs) slugs.add(s.song.slug);
      } else {
        slugs.add(item.song.slug);
      }
    }
    return slugs;
  }, [items]);

  const availableSongs = useMemo(
    () => songs.filter((s) => !addedSlugs.has(s.slug)),
    [songs, addedSlugs]
  );
  const fuse = useMemo(
    () => new Fuse(availableSongs, { keys: ["title", "titlePinyin", "artist"], threshold: 0.4 }),
    [availableSongs]
  );
  const searchResults = useMemo(
    () =>
      query.trim()
        ? fuse.search(query.trim()).map((r) => r.item).slice(0, 6)
        : availableSongs.slice(0, 6),
    [query, fuse, availableSongs]
  );

  const sensors = useDefaultSensors();

  function addSong(song: SongIndexEntry) {
    setItems((prev) => [
      ...prev,
      { uid: nextUid(), song, keyOverride: null, notes: "", sectionItems: makeDefaultSections(song.sections ?? []) },
    ]);
    setQuery("");
  }

  function addTransition() {
    setItems((prev) => [...prev, { uid: nextUid(), kind: "transition" as const, text: "" }]);
  }

  function patchTransition(uid: string, text: string) {
    setItems((prev) =>
      prev.map((i) => (i.uid === uid && isFormTransition(i) ? { ...i, text } : i))
    );
  }

  function patch(uid: string, update: Partial<FormItem>) {
    setItems((prev) =>
      prev.map((i) => (i.uid === uid && !isFormFusion(i) ? { ...i, ...update } : i))
    );
  }

  function patchFusionSong(fusionUid: string, songUid: string, update: Partial<FormItem>) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.uid !== fusionUid || !isFormFusion(item)) return item;
        return {
          ...item,
          songs: item.songs.map((s) => (s.uid === songUid ? { ...s, ...update } : s)),
        };
      })
    );
  }

  function patchFusionMixed(fusionUid: string, mixed: FusionMixedSectionForm[] | null) {
    setItems((prev) =>
      prev.map((item) =>
        item.uid === fusionUid && isFormFusion(item)
          ? { ...item, mixedStructure: mixed }
          : item
      )
    );
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.uid === active.id);
    const newIdx = items.findIndex((i) => i.uid === over.id);
    setItems(arrayMove(items, oldIdx, newIdx));
  }

  function toggleSelectSong(uid: string) {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  function mergeSongs() {
    const toMerge = items.filter(
      (i): i is FormItem => !isFormFusion(i) && selectedUids.has(i.uid)
    );
    if (toMerge.length < 2) return;
    const firstIdx = items.findIndex((i) => i.uid === toMerge[0].uid);
    const fusion: FormFusionItem = { uid: nextUid(), kind: "fusion", songs: toMerge, mixedStructure: null };
    const remaining = items.filter((i) => !selectedUids.has(i.uid));
    remaining.splice(firstIdx, 0, fusion);
    setItems(remaining);
    setSelectedUids(new Set());
    setSelectMode(false);
  }

  function unfuse(fusionUid: string) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.uid === fusionUid);
      if (idx === -1) return prev;
      const fusion = prev[idx] as FormFusionItem;
      const next = [...prev];
      next.splice(idx, 1, ...fusion.songs);
      return next;
    });
  }

  function cancelSelectMode() {
    setSelectMode(false);
    setSelectedUids(new Set());
  }

  async function doUpdate(publishDraft: boolean) {
    setError("");
    if (!title.trim()) { setError(t("setlists.form.titleRequired")); return; }
    if (!leader.trim()) { setError(t("setlists.form.leaderRequired")); return; }
    if (!category) { setError(t("setlists.form.categoryRequired")); return; }
    if (isRestricted(category) && !user) {
      router.push(`/login?from=/setlists/${id}/edit`);
      return;
    }

    publishDraft ? setPublishing(true) : setSaving(true);
    try {
      const setlistItems = buildSetlistItems(items);
      const language = detectSetlistLanguage(items);
      await updateSetlist(id, {
        title: title.trim(),
        leader: leader.trim(),
        category,
        language,
        notes: notes.trim(),
        items: setlistItems,
        isDraft: publishDraft ? false : isDraft,
      });
      router.push(`/setlists/${id}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t("setlists.form.errorSaveDefault"));
      publishDraft ? setPublishing(false) : setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await doUpdate(false);
  }

  const busy = saving || publishing;
  const needsAuth = category && isRestricted(category) && !user && !authLoading;
  const selectableItems = items.filter((i): i is FormItem => !isFormFusion(i) && !isFormTransition(i));

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-2 flex items-center gap-3">
        <a href={`/setlists/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          {t("setlists.detail.back")}
        </a>
        <h1 className="font-semibold text-foreground">
          {t("setlists.form.titleEdit")}
          {isDraft && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-800">
              {t("setlists.list.draft")}
            </span>
          )}
        </h1>
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
                  <a href={`/login?from=/setlists/${id}/edit`} className="underline font-medium">
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
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none"
            />
          </div>
        </section>

        {/* ── Chants ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("common.header.songs")}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addTransition}
                className="text-xs px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
              >
                + {t("setlists.form.addTransition", { defaultValue: "Transition" })}
              </button>
            {selectableItems.length >= 2 && (
              selectMode ? (
                <div className="flex items-center gap-2">
                  {selectedUids.size >= 2 && (
                    <button
                      type="button"
                      onClick={mergeSongs}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Link2 className="h-3 w-3" />
                      {t("setlists.form.mergeButton", { count: selectedUids.size })}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={cancelSelectMode}
                    className="text-xs px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("setlists.form.cancelSelect")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectMode(true)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("setlists.form.selectMode")}
                </button>
              )
            )}
            </div>{/* end inner flex */}
          </div>{/* end header row */}

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
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
              {searchResults.map((song) => (
                <button
                  key={song.slug}
                  type="button"
                  onClick={() => addSong(song)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground flex-1 truncate">{song.title}</span>
                  {song.language === "zh" && (
                    <span className="text-[10px] text-muted-foreground">{t("common.languages.zh")}</span>
                  )}
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

          {items.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((i) => i.uid)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map((item) =>
                    isFormTransition(item) ? (
                      <TransitionRow
                        key={item.uid}
                        item={item}
                        onTextChange={(text) => patchTransition(item.uid, text)}
                        onRemove={() => setItems((prev) => prev.filter((i) => i.uid !== item.uid))}
                      />
                    ) : isFormFusion(item) ? (
                      <FusionRow
                        key={item.uid}
                        item={item}
                        onUnfuse={() => unfuse(item.uid)}
                        onRemove={() => setItems((prev) => prev.filter((i) => i.uid !== item.uid))}
                        onPatchSong={(songUid, update) => patchFusionSong(item.uid, songUid, update)}
                        onChangeMixed={(mixed) => patchFusionMixed(item.uid, mixed)}
                      />
                    ) : (
                      <SongRow
                        key={item.uid}
                        item={item}
                        selectable={selectMode}
                        selected={selectedUids.has(item.uid)}
                        onToggleSelect={() => toggleSelectSong(item.uid)}
                        onRemove={() => setItems((prev) => prev.filter((i) => i.uid !== item.uid))}
                        onKeyChange={(key) => patch(item.uid, { keyOverride: key })}
                        onNoteChange={(note) => patch(item.uid, { notes: note })}
                        onSectionItemsChange={(sectionItems) => patch(item.uid, { sectionItems })}
                      />
                    )
                  )}
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
          {isDraft && (
            <button
              type="button"
              onClick={() => doUpdate(true)}
              disabled={busy}
              className="flex-1 py-2.5 rounded-lg bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {publishing ? t("setlists.form.publishing") : t("setlists.form.publishButton")}
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className={`py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 ${isDraft ? "flex-1" : "w-full"}`}
          >
            {saving
              ? t("setlists.form.saving")
              : isDraft
              ? t("setlists.form.saveDraftButton")
              : t("setlists.form.saveButton")}
          </button>
        </div>
      </form>
    </div>
  );
}
