"use client";

import { useState } from "react";
import { ImagePlus, Link2, Pin, Trash2, X } from "lucide-react";
import { ANNONCE_SECTIONS, type Annonce, type AnnonceLink, type AnnonceSection } from "@/types/annonce";
import { compressImage } from "@/lib/utils/compressImage";
import { categoryColor, categoryLabel } from "@/lib/serviceColors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

// Classe des contrôles natifs (select, date) — les champs texte utilisent <Input>
const inputClass =
  "w-full h-11 px-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm";

const MAX_IMAGES = 3;
// Budget total des images : un document Firestore est limité à 1 Mo
const MAX_TOTAL_CHARS = 750_000;

export interface AnnonceFormValue {
  section: AnnonceSection;
  title: string;
  body: string;
  links: AnnonceLink[];
  images: string[];
  pinned: boolean;
  expiresAt: string | null;
}

export function annonceToForm(a: Annonce): AnnonceFormValue {
  return {
    section: a.section,
    title: a.title,
    body: a.body,
    links: a.links,
    images: a.images,
    pinned: a.pinned,
    expiresAt: a.expiresAt,
  };
}

export function AnnonceForm({
  initial,
  allowedSections,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: AnnonceFormValue;
  /** Sections où l'utilisateur a le droit de publier */
  allowedSections: AnnonceSection[];
  onSubmit: (value: AnnonceFormValue) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [value, setValue] = useState<AnnonceFormValue>(
    initial ?? {
      section: allowedSections[0],
      title: "",
      body: "",
      links: [],
      images: [],
      pinned: false,
      expiresAt: null,
    }
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const set = (patch: Partial<AnnonceFormValue>) => setValue((v) => ({ ...v, ...patch }));

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setCompressing(true);
    try {
      const next = [...value.images];
      for (const file of Array.from(files)) {
        if (next.length >= MAX_IMAGES) break;
        const compressed = await compressImage(file);
        const total = next.reduce((n, i) => n + i.length, 0) + compressed.length;
        if (total > MAX_TOTAL_CHARS) {
          setError("Limite d'images atteinte pour cette annonce (poids total).");
          break;
        }
        next.push(compressed);
      }
      set({ images: next });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'ajout de l'image.");
    } finally {
      setCompressing(false);
    }
  }

  async function handleSubmit() {
    setError("");
    if (!value.title.trim()) { setError("Donne un titre à l'annonce."); return; }
    if (!value.body.trim() && value.images.length === 0) {
      setError("L'annonce est vide — ajoute du texte ou une image.");
      return;
    }
    for (const l of value.links) {
      if (l.url.trim() && !/^https?:\/\//i.test(l.url.trim())) {
        setError(`Le lien « ${l.url} » doit commencer par http:// ou https://`);
        return;
      }
    }
    setSaving(true);
    try {
      await onSubmit({
        ...value,
        title: value.title.trim(),
        body: value.body.trim(),
        links: value.links
          .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
          .filter((l) => l.url),
        expiresAt: value.expiresAt || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Section + titre */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Section <span className="text-destructive">*</span>
          </label>
          <select
            value={value.section}
            onChange={(e) => set({ section: e.target.value as AnnonceSection })}
            className={inputClass}
            style={{ borderLeftWidth: 4, borderLeftColor: categoryColor(value.section) }}
          >
            {ANNONCE_SECTIONS.filter((s) => allowedSections.includes(s)).map((s) => (
              <option key={s} value={s}>{categoryLabel(s)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Titre <span className="text-destructive">*</span>
          </label>
          <Input
            type="text"
            value={value.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="ex. Répétition exceptionnelle samedi"
            className="h-11"
          />
        </div>
      </div>

      {/* Texte */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Texte</label>
        <Textarea
          value={value.body}
          onChange={(e) => set({ body: e.target.value })}
          rows={4}
          placeholder="Le contenu de l'annonce… (les liens collés ici seront cliquables)"
          className="resize-y"
        />
      </div>

      {/* Liens */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-muted-foreground">Liens</label>
        {value.links.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              type="text"
              value={l.label}
              onChange={(e) => {
                const links = [...value.links];
                links[i] = { ...links[i], label: e.target.value };
                set({ links });
              }}
              placeholder="Libellé (ex. Formulaire d'inscription)"
              className="h-11 flex-1"
            />
            <Input
              type="url"
              value={l.url}
              onChange={(e) => {
                const links = [...value.links];
                links[i] = { ...links[i], url: e.target.value };
                set({ links });
              }}
              placeholder="https://…"
              className="h-11 flex-1"
            />
            <button
              type="button"
              onClick={() => set({ links: value.links.filter((_, j) => j !== i) })}
              className="shrink-0 h-11 w-11 rounded-lg border border-border text-muted-foreground hover:text-destructive flex items-center justify-center"
              aria-label="Retirer le lien"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set({ links: [...value.links, { label: "", url: "" }] })}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <Link2 className="h-3.5 w-3.5" />
          Ajouter un lien
        </button>
      </div>

      {/* Images */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-muted-foreground">
          Images <span className="text-muted-foreground/70">(max {MAX_IMAGES}, compressées automatiquement)</span>
        </label>
        {value.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {value.images.map((img, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={`Image ${i + 1}`}
                  className="h-20 w-20 object-cover rounded-lg border border-border"
                />
                <button
                  type="button"
                  onClick={() => set({ images: value.images.filter((_, j) => j !== i) })}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center shadow"
                  aria-label="Retirer l'image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {value.images.length < MAX_IMAGES && (
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer">
            <ImagePlus className="h-3.5 w-3.5" />
            {compressing ? "Compression…" : "Ajouter une image"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={compressing}
              onChange={(e) => { addImages(e.target.files); e.target.value = ""; }}
            />
          </label>
        )}
      </div>

      {/* Épingle + expiration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <Checkbox
            checked={value.pinned}
            onCheckedChange={(checked) => set({ pinned: checked === true })}
          />
          <Pin className="h-3.5 w-3.5 text-muted-foreground" />
          Épingler en haut de la liste
        </label>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Disparaît après le (optionnel)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={value.expiresAt ?? ""}
              onChange={(e) => set({ expiresAt: e.target.value || null })}
              className={inputClass}
            />
            {value.expiresAt && (
              <button
                type="button"
                onClick={() => set({ expiresAt: null })}
                className="shrink-0 h-11 w-11 rounded-lg border border-border text-muted-foreground hover:text-foreground flex items-center justify-center"
                aria-label="Retirer la date d'expiration"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{error}</p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="h-11">
          Annuler
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={saving || compressing} className="h-11">
          {saving ? "Enregistrement…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
