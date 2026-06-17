"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Search } from "lucide-react";
import {
  SERVICE_ROLE_LABELS,
  GROUPES,
  type ServiceRole,
} from "@/types/user";
import { RESTRICTED_CATEGORIES } from "@/lib/firebase/setlists";
import { EDD_CLASSES } from "@/lib/planning/utils";
import { categoryColor, categoryLabel } from "@/lib/serviceColors";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ProfileFormValue {
  firstName: string;
  lastName: string;
  planningName: string;
  /** Rôles de service par catégorie — cf. UserProfile.serviceRoles */
  serviceRoles: Record<string, ServiceRole[]>;
}

export const EMPTY_PROFILE_FORM: ProfileFormValue = {
  firstName: "",
  lastName: "",
  planningName: "",
  serviceRoles: {},
};

/** Fonction de dérivation des rôles depuis le planning, pour pré-remplir le formulaire. */
export type DeriveFromPlanning = (name: string) => Record<string, ServiceRole[]>;

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function CheckPill({
  checked,
  label,
  onToggle,
  color,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  /** Couleur du service (pastille colorée quand cochée) — primaire par défaut */
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-2 min-h-11 rounded-lg border text-sm font-medium transition-all duration-150 active:scale-[.97] ${
        checked && !color
          ? "bg-primary/10 border-primary text-primary"
          : checked
          ? ""
          : "bg-background border-border text-muted-foreground hover:text-foreground"
      }`}
      style={checked && color ? { background: `${color}15`, borderColor: color, color } : undefined}
    >
      {checked ? "✓ " : ""}{label}
    </button>
  );
}

type SectionProps = {
  value: ProfileFormValue;
  onChange: (v: ProfileFormValue) => void;
};

// ─── Identité ─────────────────────────────────────────────────────────────────

export function IdentityFields({ value, onChange }: SectionProps) {
  const { t } = useTranslation();
  const set = (patch: Partial<ProfileFormValue>) => onChange({ ...value, ...patch });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="profile-firstname">
          {t("profile.fields.firstName")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="profile-firstname"
          type="text"
          value={value.firstName}
          onChange={(e) => set({ firstName: e.target.value })}
          required
          autoComplete="given-name"
          className="h-11"
          placeholder={t("profile.fields.firstNamePlaceholder")}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-lastname">
          {t("profile.fields.lastName")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="profile-lastname"
          type="text"
          value={value.lastName}
          onChange={(e) => set({ lastName: e.target.value })}
          required
          autoComplete="family-name"
          className="h-11"
          placeholder={t("profile.fields.lastNamePlaceholder")}
        />
      </div>
    </div>
  );
}

// ─── Rôles de service par catégorie ───────────────────────────────────────────

// Catégories regroupées par type, avec les rôles pertinents pour chacune.
const CATEGORY_GROUPS: { titleKey: string; cats: readonly string[]; roles: ServiceRole[] }[] = [
  {
    titleKey: "profile.fields.groupCultes",
    cats: RESTRICTED_CATEGORIES,
    roles: ["presidence", "chanteur", "musicien", "regie"],
  },
  { titleKey: "profile.fields.groupGroupes", cats: GROUPES, roles: ["presidence", "musicien"] },
  { titleKey: "profile.fields.groupEdd", cats: EDD_CLASSES, roles: ["presidence", "musicien"] },
];

export function ServiceGrid({
  value,
  onChange,
  deriveFromPlanning,
}: SectionProps & { deriveFromPlanning?: DeriveFromPlanning }) {
  const { t } = useTranslation();
  const sr = value.serviceRoles;
  const setSr = (next: Record<string, ServiceRole[]>) => onChange({ ...value, serviceRoles: next });

  const toggleCat = (cat: string) => {
    const next = { ...sr };
    if (cat in next) delete next[cat];
    else next[cat] = [];
    setSr(next);
  };
  const toggleRole = (cat: string, role: ServiceRole) => {
    setSr({ ...sr, [cat]: toggle(sr[cat] ?? [], role) });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="block">{t("profile.fields.accessTitle")}</Label>
          <p className="text-xs text-muted-foreground mt-1">{t("profile.fields.accessHint")}</p>
        </div>
        {deriveFromPlanning && value.planningName && (
          <button
            type="button"
            onClick={() => setSr(deriveFromPlanning(value.planningName))}
            className="shrink-0 text-xs font-semibold text-primary hover:underline whitespace-nowrap"
          >
            {t("profile.fields.prefillFromPlanning")}
          </button>
        )}
      </div>

      {CATEGORY_GROUPS.map((g) => (
        <div key={g.titleKey}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            {t(g.titleKey)}
          </p>
          <div className="space-y-1.5">
            {g.cats.map((cat) => {
              const active = cat in sr;
              const color = categoryColor(cat);
              return (
                <div
                  key={cat}
                  className={`rounded-lg border ${active ? "border-border bg-muted/30" : "border-border"}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleCat(cat)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium"
                    style={active ? { color } : undefined}
                  >
                    <span className={active ? "" : "text-muted-foreground"}>
                      {active ? "✓ " : ""}{categoryLabel(cat)}
                    </span>
                  </button>
                  {active && (
                    <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
                      {g.roles.map((role) => (
                        <CheckPill
                          key={role}
                          checked={(sr[cat] ?? []).includes(role)}
                          label={SERVICE_ROLE_LABELS[role]}
                          color={color}
                          onToggle={() => toggleRole(cat, role)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Nom de planning ──────────────────────────────────────────────────────────

function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function NameOption({
  active,
  label,
  muted,
  onClick,
}: {
  active: boolean;
  label: string;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-primary/10 text-primary font-medium"
          : muted
          ? "text-muted-foreground hover:bg-muted"
          : "text-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

export function PlanningNameField({
  value,
  onChange,
  planningNames,
  deriveFromPlanning,
}: SectionProps & { planningNames: string[]; deriveFromPlanning?: DeriveFromPlanning }) {
  const { t } = useTranslation();
  const set = (patch: Partial<ProfileFormValue>) => onChange({ ...value, ...patch });
  const [customName, setCustomName] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Les noms chargent en asynchrone : un nom enregistré absent de la liste passe en saisie libre
  const isCustom =
    customName || (value.planningName !== "" && !planningNames.includes(value.planningName));

  const q = normalizeName(query);
  const filtered = q ? planningNames.filter((n) => normalizeName(n).includes(q)) : planningNames;

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const selectName = (name: string) => {
    setCustomName(false);
    // Sélectionner un nom du planning pré-remplit les rôles de service ; choisir
    // « pas dans les plannings » (name vide) ne touche pas aux rôles déjà saisis.
    set(name && deriveFromPlanning ? { planningName: name, serviceRoles: deriveFromPlanning(name) } : { planningName: name });
    close();
  };

  const triggerLabel = isCustom
    ? t("profile.fields.otherName")
    : value.planningName || t("profile.fields.notInPlannings");

  return (
    <div>
      <Label className="mb-1 block">{t("profile.fields.planningName")}</Label>
      <p className="text-xs text-muted-foreground mb-2">{t("profile.fields.planningNameHint")}</p>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-11 px-3 flex items-center justify-between gap-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <span className={isCustom || value.planningName ? "text-foreground" : "text-muted-foreground"}>
          {triggerLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-1 rounded-lg border border-border bg-background shadow-sm overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") close();
                }}
                placeholder={t("profile.fields.searchName")}
                className="h-10 pl-8"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            <NameOption
              active={!isCustom && value.planningName === ""}
              label={t("profile.fields.notInPlannings")}
              muted
              onClick={() => selectName("")}
            />
            {filtered.map((n) => (
              <NameOption
                key={n}
                active={!isCustom && value.planningName === n}
                label={n}
                onClick={() => selectName(n)}
              />
            ))}
            {q && filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {t("profile.fields.noNameResults")}
              </p>
            )}
            <NameOption
              active={isCustom}
              label={t("profile.fields.otherName")}
              muted
              onClick={() => {
                setCustomName(true);
                set({ planningName: "" });
                close();
              }}
            />
          </div>
        </div>
      )}

      {isCustom && (
        <Input
          type="text"
          value={value.planningName}
          onChange={(e) => set({ planningName: e.target.value })}
          placeholder={t("profile.fields.customNamePlaceholder")}
          className="h-11 mt-2"
        />
      )}
    </div>
  );
}

// ─── Formulaire complet (page profil + admin) ─────────────────────────────────

export function ProfileFields({
  value,
  onChange,
  planningNames,
  deriveFromPlanning,
}: SectionProps & { planningNames: string[]; deriveFromPlanning?: DeriveFromPlanning }) {
  return (
    <div className="space-y-6">
      <IdentityFields value={value} onChange={onChange} />
      <PlanningNameField
        value={value}
        onChange={onChange}
        planningNames={planningNames}
        deriveFromPlanning={deriveFromPlanning}
      />
      <ServiceGrid value={value} onChange={onChange} deriveFromPlanning={deriveFromPlanning} />
    </div>
  );
}
