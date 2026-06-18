"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Search, X, AlertTriangle, Link2, Lock, Globe, Plus, ChevronDown, ChevronUp, Check } from "lucide-react";
import Fuse from "fuse.js";
import {
  RESTRICTED_CATEGORIES,
  ALL_CATEGORIES,
  authHeader,
  createSetlist,
  updateSetlist,
  deleteSetlist,
} from "@/lib/firebase/setlists";
import { useProfile } from "@/lib/firebase/users";
import { creatableCategories, isAdminUser } from "@/lib/access";
import { loadPlanningData, setlistSeances, categoryMembers, type PlanningData, type SetlistSeance } from "@/lib/planning/names";
import { useTranslation } from "react-i18next";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  type FormItem,
  type FormFusionItem,
  type FormListItem,
  type FusionMixedSectionForm,
  isFormFusion,
  isFormTransition,
  makeDefaultSections,
} from "@/lib/setlist/formItems";
import { buildSetlistItems, detectSetlistLanguage } from "@/lib/setlist/buildSetlistItems";
import type { SongIndexEntry } from "@/types/song";
import { useDefaultSensors } from "@/lib/dnd/sensors";
import { nextUid } from "@/lib/uid";
import { SongRow, FusionRow, TransitionRow } from "@/components/setlists/SetlistFormRows";

const FREE_CATEGORIES = ["Groupe Paix", "Groupe Fidélité", "Groupe Bonté", "中班", "大班", "高班"];

export interface SetlistFormInitial {
  title: string;
  date: string;
  leader: string;
  category: string;
  moment?: "matin" | "soir";
  notes: string;
  isPrivate: boolean;
  ownerId: string | null;
  items: FormListItem[];
}

export interface SetlistFormProps {
  mode: "create" | "edit";
  /** Requis en mode edit */
  setlistId?: string;
  songs: SongIndexEntry[];
  /** État initial (mode edit) — lu une seule fois au montage */
  initial?: SetlistFormInitial;
}

/** Déclenche la notif « setlist prête » en mode auto après une sauvegarde.
 *  Le serveur n'envoie que si la setlist a ≥ 4 chants et n'a pas déjà prévenu
 *  l'équipe. Fire-and-forget : tout échec (réseau, droits) est silencieux. */
async function notifySetlistReady(setlistId: string): Promise<void> {
  try {
    const headers = await authHeader();
    await fetch("/api/push/notify-setlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ setlistId, auto: true }),
    });
  } catch {
    /* réseau indisponible */
  }
}

export function SetlistForm({ mode, setlistId, songs, initial }: SetlistFormProps) {
  const isEdit = mode === "edit";
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useProfile();

  // ── Form state ──────────────────────────────────────────
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().split("T")[0]);
  const [leader, setLeader] = useState(initial?.leader ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false);
  const [items, setItems] = useState<FormListItem[]>(initial?.items ?? []);
  const [moment, setMoment] = useState<"matin" | "soir" | undefined>(initial?.moment);
  const ownerId = initial?.ownerId ?? null;

  // ── Sélecteurs planning : responsable (membres) + date (séances) ─────────
  const [planning, setPlanning] = useState<PlanningData | null>(null);
  const [dateKey, setDateKey] = useState("");            // "date|moment" de la séance choisie
  const [dateOther, setDateOther] = useState(false);      // date hors planning (saisie libre)
  const [leaderOther, setLeaderOther] = useState(false);  // responsable hors liste (saisie libre)

  // ── UI state ────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());

  // ── Auto-save (mode création uniquement) ────────────────
  const [autoSaveId, setAutoSaveId] = useState<string | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveIdRef = useRef<string | null>(null);
  autoSaveIdRef.current = autoSaveId;
  // Id réellement validé (clic « Créer ») — distingue un brouillon publié d'un abandonné.
  const committedIdRef = useRef<string | null>(null);

  // Nettoyage au démontage : supprime le brouillon d'autosave s'il a été abandonné
  // (l'utilisateur quitte sans valider) ou si « Créer » a publié un autre document
  // (course). Évite l'accumulation de drafts orphelins invisibles en base.
  useEffect(() => {
    return () => {
      const draftId = autoSaveIdRef.current;
      if (!isEdit && draftId && draftId !== committedIdRef.current) {
        void deleteSetlist(draftId);
      }
    };
  }, [isEdit]);

  const loginFrom = isEdit ? `/setlists/${setlistId}/edit` : "/setlists/new";

  // Charge le planning pour proposer les séances
  useEffect(() => { loadPlanningData().then(setPlanning); }, []);

  // Séances de la catégorie choisie (clé = date|moment)
  const categorySeances = useMemo<(SetlistSeance & { key: string })[]>(() => {
    if (!planning || !category) return [];
    return setlistSeances(planning)
      .filter((s) => s.category === category)
      .map((s) => ({ ...s, key: `${s.date}|${s.moment ?? ""}` }));
  }, [planning, category]);

  // Membres de la catégorie (noms seuls) — alimente le champ Responsable.
  const categoryMemberList = useMemo<string[]>(
    () => (planning && category ? categoryMembers(planning, category) : []),
    [planning, category]
  );

  // Libellé date seule d'une séance (sans nom) : "12/04" ou "28/07 · Soir" (Campus).
  const seanceDateLabel = (s: SetlistSeance & { key: string }) => {
    const [, mm, dd] = s.date.split("-");
    const mom = s.moment ? (s.moment === "soir" ? " · Soir" : " · Matin") : "";
    return `${dd}/${mm}${mom}`;
  };

  // Édition : pré-sélectionne la date liée (sinon « autre date ») et marque le
  // responsable comme « autre » s'il n'est pas dans la liste des membres.
  const initApplied = useRef(false);
  useEffect(() => {
    if (!isEdit || !planning || initApplied.current) return;
    initApplied.current = true;
    const wantKey = `${initial?.date ?? ""}|${initial?.moment ?? ""}`;
    if (categorySeances.some((s) => s.key === wantKey)) setDateKey(wantKey);
    else setDateOther(true);
    if (initial?.leader && !categoryMemberList.includes(initial.leader)) setLeaderOther(true);
  }, [isEdit, planning, categorySeances, categoryMemberList, initial]);

  const onCategoryChange = (c: string) => {
    setCategory(c);
    setDateKey("");
    setDateOther(false);
    setLeaderOther(false);
    setMoment(undefined);
    setLeader("");
  };

  // Responsable : choix d'un membre (nom) ou « Autre » (saisie libre).
  const onLeaderSelect = (v: string) => {
    if (v === "__other__") { setLeaderOther(true); setLeader(""); return; }
    setLeaderOther(false);
    setLeader(v);
  };

  // Date : choix d'une séance (remplit date + moment + titre auto) ou « Autre date ».
  const onDateSelect = (v: string) => {
    if (v === "__other__") { setDateOther(true); setDateKey(""); setMoment(undefined); return; }
    if (v === "") { setDateOther(false); setDateKey(""); setMoment(undefined); return; }
    const s = categorySeances.find((x) => x.key === v);
    if (!s) return;
    setDateOther(false);
    setDateKey(v);
    setDate(s.date);
    setMoment(s.moment);
    if (!title.trim()) {
      const catLabel = t("categories." + s.category, { defaultValue: s.category });
      const [, mm, dd] = s.date.split("-");
      const mom = s.moment ? (s.moment === "soir" ? " Soir" : " Matin") : "";
      setTitle(`${catLabel} ${dd}/${mm}${mom}`);
    }
  };

  useEffect(() => {
    if (isEdit) return;
    if (!user) return;
    if (!title.trim() || !category) return;
    const timer = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const setlistItems = buildSetlistItems(items);
        const language = detectSetlistLanguage(items);
        const payload = {
          title: title.trim(),
          leader: leader.trim(),
          category,
          date,
          moment,
          language,
          notes: notes.trim(),
          items: setlistItems,
          // Brouillon invisible dans les listes tant que l'utilisateur n'a pas cliqué « Créer »
          isDraft: true,
          isPrivate,
          ownerId: user?.uid ?? null,
        };
        if (autoSaveIdRef.current) {
          await updateSetlist(autoSaveIdRef.current, payload);
        } else {
          const id = await createSetlist(payload);
          setAutoSaveId(id);
        }
        setLastSaved(new Date());
      } catch {
        // silently ignore auto-save errors
      } finally {
        setAutoSaving(false);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [isEdit, title, leader, category, date, moment, notes, isPrivate, items, user]);

  // ── Song search ────────────────────────────────────────
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
        ? fuse.search(query.trim()).map((r) => r.item).slice(0, 20)
        : availableSongs,
    [query, fuse, availableSongs]
  );

  const sensors = useDefaultSensors();

  // ── Song actions ───────────────────────────────────────
  function addSong(song: SongIndexEntry) {
    setItems((prev) => [
      ...prev,
      { uid: nextUid(), song, keyOverride: null, notes: "", sectionItems: makeDefaultSections(song.sections ?? []) },
    ]);
    setExpandedSlug(null);
  }

  function addTransition() {
    setItems((prev) => [...prev, { uid: nextUid(), kind: "transition" as const, text: "" }]);
  }

  function patchTransition(uid: string, text: string) {
    setItems((prev) => prev.map((i) => (i.uid === uid && isFormTransition(i) ? { ...i, text } : i)));
  }

  function patch(uid: string, update: Partial<FormItem>) {
    setItems((prev) =>
      prev.map((i) => (i.uid === uid && !isFormFusion(i) && !isFormTransition(i) ? { ...i, ...update } : i))
    );
  }

  function patchFusionSong(fusionUid: string, songUid: string, update: Partial<FormItem>) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.uid !== fusionUid || !isFormFusion(item)) return item;
        return { ...item, songs: item.songs.map((s) => (s.uid === songUid ? { ...s, ...update } : s)) };
      })
    );
  }

  function patchFusionMixed(fusionUid: string, mixed: FusionMixedSectionForm[] | null) {
    setItems((prev) =>
      prev.map((item) =>
        item.uid === fusionUid && isFormFusion(item) ? { ...item, mixedStructure: mixed } : item
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
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  }

  function mergeSongs() {
    const toMerge = items.filter(
      (i): i is FormItem => !isFormFusion(i) && !isFormTransition(i) && selectedUids.has(i.uid)
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

  // ── Submit ─────────────────────────────────────────────
  const doSubmit = useCallback(async () => {
    setError("");
    if (!title.trim()) { setError(t("setlists.form.titleRequired")); return; }
    if (!date) { setError(t("setlists.form.dateRequired")); return; }
    if (!leader.trim()) { setError(t("setlists.form.leaderRequired")); return; }
    if (!category) { setError(t("setlists.form.categoryRequired")); return; }
    if (!dateKey && !dateOther) { setError(t("setlists.form.dateRequired")); return; }
    if (!user) {
      router.push(`/login?from=${loginFrom}`);
      return;
    }

    setSaving(true);
    try {
      const setlistItems = buildSetlistItems(items);
      const language = detectSetlistLanguage(items);
      const payload = {
        title: title.trim(), leader: leader.trim(), category, date, moment, language,
        notes: notes.trim(), items: setlistItems, isDraft: false,
        // Création : le créateur devient propriétaire. Édition : on conserve le propriétaire.
        isPrivate, ownerId: isEdit ? ownerId : (user?.uid ?? null),
      };
      let savedId: string;
      if (isEdit && setlistId) {
        await updateSetlist(setlistId, payload);
        savedId = setlistId;
      } else {
        const targetId = autoSaveIdRef.current;
        if (targetId) {
          await updateSetlist(targetId, payload);
          savedId = targetId;
        } else {
          savedId = await createSetlist(payload);
        }
      }
      committedIdRef.current = savedId;
      // Prévient automatiquement l'équipe si la setlist est prête (≥ 4 chants),
      // une seule fois. Ne bloque pas la navigation. Jamais pour une setlist
      // privée (brouillon personnel → ne doit pas notifier l'équipe planifiée).
      if (!isPrivate) void notifySetlistReady(savedId);
      router.push(`/setlists/${savedId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(isEdit ? "setlists.form.errorSaveDefault" : "setlists.form.errorDefault")
      );
      setSaving(false);
    }
  }, [title, leader, category, date, moment, notes, isPrivate, items, user, router, t, isEdit, setlistId, ownerId, loginFrom, dateKey, dateOther]);

  const busy = saving;
  const needsAuth = !user && !authLoading;

  // Catégories proposées : celles où le profil peut CRÉER (+ la catégorie actuelle en édition) — admins : toutes.
  // La régie ne peut pas créer de setlist de culte : exclue ici via creatableCategories.
  const myCats = isAdminUser(user)
    ? [...ALL_CATEGORIES]
    : profile
    ? creatableCategories(profile)
    : [];
  const allowedRestricted = RESTRICTED_CATEGORIES.filter(
    (c) => myCats.includes(c) || c === initial?.category
  );
  const allowedFree = FREE_CATEGORIES.filter(
    (c) => myCats.includes(c) || c === initial?.category
  );
  const selectableItems = items.filter((i): i is FormItem => !isFormFusion(i) && !isFormTransition(i));

  const submitLabel = busy
    ? t(isEdit ? "setlists.form.saving" : "setlists.form.creating")
    : t(isEdit ? "setlists.form.saveButton" : "setlists.form.createButton");

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header sticky ── */}
      <div className="sticky top-[var(--nav-h)] z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-2.5 flex items-center gap-3">
        <a
          href={isEdit ? `/setlists/${setlistId}` : "/setlists"}
          className="text-sm text-muted-foreground hover:text-foreground shrink-0"
        >
          ←
        </a>
        <span className="font-semibold text-foreground text-sm truncate">
          {title.trim() || t(isEdit ? "setlists.form.titleEdit" : "setlists.form.titleNew")}
        </span>

        {/* Auto-save indicator (création uniquement) */}
        {!isEdit && (
          <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:flex items-center gap-1">
            {autoSaving ? (
              <span className="animate-pulse">Sauvegarde…</span>
            ) : lastSaved ? (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="h-3 w-3" /> Brouillon sauvegardé
              </span>
            ) : null}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => doSubmit()}
            disabled={busy}
            className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Carte Informations ── */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("setlists.form.infoSection")}
          </h2>

          {/* Titre + Catégorie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
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
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t("setlists.form.categoryLabel")} <span className="text-destructive">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              >
                <option value="">{t("setlists.form.categoryPlaceholder")}</option>
                <optgroup label={t("setlists.form.categoryGroupRestricted")}>
                  {allowedRestricted.map((c) => (
                    <option key={c} value={c}>{t("categories." + c, { defaultValue: c })}</option>
                  ))}
                </optgroup>
                <optgroup label={t("setlists.form.categoryGroupFree")}>
                  {allowedFree.map((c) => (
                    <option key={c} value={c}>{t("categories." + c, { defaultValue: c })}</option>
                  ))}
                </optgroup>
              </select>
              {needsAuth && (
                <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    {t("setlists.form.categoryRestrictedAuthWarning")}{" "}
                    <a href={`/login?from=${loginFrom}`} className="underline font-medium">
                      {t("common.header.login")}
                    </a>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Responsable (membres du groupe) + Date de la séance. La date reste
              enregistrée (notifs « setlist prête », Mes Services) mais le menu
              n'affiche que des noms — pas de date mêlée aux noms. */}
          {category && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Responsable : liste de membres (noms seuls) */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t("setlists.form.responsableLabel")} <span className="text-destructive">*</span>
                </label>
                <select
                  value={leaderOther ? "__other__" : leader}
                  onChange={(e) => onLeaderSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                >
                  <option value="">{t("setlists.form.responsablePlaceholder")}</option>
                  {categoryMemberList.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  <option value="__other__">{t("setlists.form.responsableOther")}</option>
                </select>
                {leaderOther && (
                  <input
                    type="text"
                    value={leader}
                    onChange={(e) => setLeader(e.target.value)}
                    placeholder={t("setlists.form.leaderPlaceholder")}
                    className="mt-2 w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  />
                )}
              </div>

              {/* Date : séances du planning (date seule) ou date libre */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t("setlists.form.dateLabel")} <span className="text-destructive">*</span>
                </label>
                <select
                  value={dateOther ? "__other__" : dateKey}
                  onChange={(e) => onDateSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                >
                  <option value="">{t("setlists.form.datePlaceholder")}</option>
                  {categorySeances.map((s) => (
                    <option key={s.key} value={s.key}>{seanceDateLabel(s)}</option>
                  ))}
                  <option value="__other__">{t("setlists.form.dateOther")}</option>
                </select>
                {dateOther && (
                  <div className="mt-2 space-y-2">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    />
                    {category === "Campus" && (
                      <select
                        value={moment ?? ""}
                        onChange={(e) => setMoment((e.target.value || undefined) as "matin" | "soir" | undefined)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                      >
                        <option value="">—</option>
                        <option value="matin">Matin</option>
                        <option value="soir">Soir</option>
                      </select>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Visibilité */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              {t("setlists.form.visibilityLabel")}
            </label>
            <div className="flex rounded-lg border border-border overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 transition-colors ${
                  !isPrivate ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Globe className="h-3.5 w-3.5" /> Partagée
              </button>
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 transition-colors border-l border-border ${
                  isPrivate ? "bg-violet-600 text-white" : "bg-background text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Lock className="h-3.5 w-3.5" /> Privée
              </button>
            </div>
            {isPrivate && !user && !authLoading && (
              <p className="mt-1.5 text-xs text-violet-700 dark:text-violet-400">
                {t("setlists.form.privateLoginRequired")}
              </p>
            )}
            {isPrivate && user && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("setlists.form.privateToggle")}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
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
        </div>

        {/* ── Section Chants ── */}
        <div className="space-y-3">
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
                + {t("setlists.form.addTransition")}
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
                      onClick={() => { setSelectMode(false); setSelectedUids(new Set()); }}
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
            </div>
          </div>

          {/* Recherche + résultats scrollables */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("setlists.form.searchSongsPlaceholder")}
                className="w-full pl-9 pr-8 py-2.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none text-sm border-b border-border"
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

            {availableSongs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t("setlists.form.allSongsAdded")}
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {searchResults.map((song) => (
                  <div key={song.slug}>
                    <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors">
                      <button
                        type="button"
                        onClick={() => setExpandedSlug(expandedSlug === song.slug ? null : song.slug)}
                        className="flex-1 flex items-center gap-2 text-left min-w-0"
                      >
                        <span className="text-sm font-medium text-foreground truncate">{song.title}</span>
                        {song.language === "zh" && (
                          <span className="shrink-0 text-[10px] text-muted-foreground">{t("common.languages.zh")}</span>
                        )}
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">{song.originalKey}</span>
                        {expandedSlug === song.slug
                          ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        }
                      </button>
                      <button
                        type="button"
                        onClick={() => addSong(song)}
                        className="shrink-0 flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-semibold"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t("common.buttons.add")}
                      </button>
                    </div>
                    {expandedSlug === song.slug && song.sections && song.sections.length > 0 && (
                      <div className="px-3 pb-2.5 flex flex-wrap gap-1.5 bg-muted/20">
                        {song.sections.map((s) => (
                          <span key={s.id} className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Setlist (chants ajoutés) */}
          {items.length > 0 ? (
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
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-xl">
              {t("setlists.form.emptySongs")}
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Bouton bas de page (pratique sur mobile après un long formulaire) */}
        <button
          type="button"
          onClick={() => doSubmit()}
          disabled={busy}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
