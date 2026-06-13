"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Search } from "lucide-react";
import {
  SERVICE_ROLES,
  SERVICE_ROLE_LABELS,
  SERVICE_LIEUX,
  EDD_ROLES,
  GROUPES,
  type ServiceRole,
  type ServiceLieu,
  type EddRole,
  type Groupe,
} from "@/types/user";
import { categoryColor } from "@/lib/serviceColors";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export interface ProfileFormValue {
  firstName: string;
  lastName: string;
  planningName: string;
  roles: ServiceRole[];
  lieux: ServiceLieu[];
  edd: boolean;
  eddRoles: EddRole[];
  groupe: Groupe | null;
  groupeMusicien: boolean;
}

export const EMPTY_PROFILE_FORM: ProfileFormValue = {
  firstName: "",
  lastName: "",
  planningName: "",
  roles: [],
  lieux: [],
  edd: false,
  eddRoles: [],
  groupe: null,
  groupeMusicien: false,
};

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

// ─── Service à l'église (rôles + lieux + EDD) ─────────────────────────────────

export function ServiceFields({ value, onChange }: SectionProps) {
  const { t } = useTranslation();
  const set = (patch: Partial<ProfileFormValue>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-1 block">{t("profile.fields.serveQuestion")}</Label>
        <p className="text-xs text-muted-foreground mb-2">{t("profile.fields.serveHint")}</p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_ROLES.map((r) => (
            <CheckPill
              key={r}
              checked={value.roles.includes(r)}
              label={SERVICE_ROLE_LABELS[r]}
              onToggle={() => {
                const roles = toggle(value.roles, r);
                set({ roles, lieux: roles.length ? value.lieux : [] });
              }}
            />
          ))}
        </div>
      </div>

      {value.roles.length > 0 && (
        <div>
          <Label className="mb-1 block">
            {t("profile.fields.whereServe")} <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground mb-2">{t("profile.fields.multipleChoices")}</p>
          <div className="flex flex-wrap gap-2">
            {SERVICE_LIEUX.map((l) => (
              <CheckPill
                key={l}
                checked={value.lieux.includes(l as ServiceLieu)}
                label={l === "Interfranco" ? "Intergroupe francophone" : l}
                color={categoryColor(l)}
                onToggle={() => set({ lieux: toggle(value.lieux, l as ServiceLieu) })}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
          <Checkbox
            checked={value.edd}
            onCheckedChange={(checked) =>
              set({ edd: checked === true, eddRoles: checked === true ? value.eddRoles : [] })
            }
          />
          {t("profile.fields.eddCheckbox")}
        </label>
        {value.edd && (
          <div className="mt-2 flex flex-wrap gap-2 pl-6">
            {EDD_ROLES.map((r) => (
              <CheckPill
                key={r}
                checked={value.eddRoles.includes(r)}
                label={r === "musicien" ? t("profile.fields.musicien") : t("profile.fields.presidence")}
                color="#3b6d11"
                onToggle={() => set({ eddRoles: toggle(value.eddRoles, r) })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Groupe ───────────────────────────────────────────────────────────────────

export function GroupeFields({ value, onChange }: SectionProps) {
  const { t } = useTranslation();
  const set = (patch: Partial<ProfileFormValue>) => onChange({ ...value, ...patch });
  return (
    <div>
      <Label className="mb-2 block">{t("profile.fields.groupeQuestion")}</Label>
      <div className="flex flex-wrap gap-2">
        <CheckPill
          checked={value.groupe === null}
          label={t("profile.fields.none")}
          onToggle={() => set({ groupe: null, groupeMusicien: false })}
        />
        {GROUPES.map((g) => (
          <CheckPill
            key={g}
            checked={value.groupe === g}
            label={g}
            color={categoryColor(g)}
            onToggle={() => set({ groupe: g })}
          />
        ))}
      </div>
      {value.groupe && (
        <label className="mt-2 flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <Checkbox
            checked={value.groupeMusicien}
            onCheckedChange={(checked) => set({ groupeMusicien: checked === true })}
          />
          {t("profile.fields.groupeMusicien")}
        </label>
      )}
    </div>
  );
}

// ─── Nom de planning ──────────────────────────────────────────────────────────

function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
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
}: SectionProps & { planningNames: string[] }) {
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
    set({ planningName: name });
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
}: SectionProps & { planningNames: string[] }) {
  return (
    <div className="space-y-5">
      <IdentityFields value={value} onChange={onChange} />
      <ServiceFields value={value} onChange={onChange} />
      <GroupeFields value={value} onChange={onChange} />
      <PlanningNameField value={value} onChange={onChange} planningNames={planningNames} />
    </div>
  );
}
