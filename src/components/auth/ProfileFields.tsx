"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
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

const CUSTOM_NAME = "__autre__";

export function PlanningNameField({
  value,
  onChange,
  planningNames,
}: SectionProps & { planningNames: string[] }) {
  const { t } = useTranslation();
  const set = (patch: Partial<ProfileFormValue>) => onChange({ ...value, ...patch });
  const [customName, setCustomName] = useState(false);
  // Les noms chargent en asynchrone : un nom enregistré absent de la liste passe en saisie libre
  const isCustom =
    customName || (value.planningName !== "" && !planningNames.includes(value.planningName));

  return (
    <div>
      <Label className="mb-1 block">{t("profile.fields.planningName")}</Label>
      <p className="text-xs text-muted-foreground mb-2">{t("profile.fields.planningNameHint")}</p>
      <select
        value={isCustom ? CUSTOM_NAME : value.planningName}
        onChange={(e) => {
          if (e.target.value === CUSTOM_NAME) {
            setCustomName(true);
            set({ planningName: "" });
          } else {
            setCustomName(false);
            set({ planningName: e.target.value });
          }
        }}
        className="w-full h-11 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">{t("profile.fields.notInPlannings")}</option>
        {planningNames.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
        <option value={CUSTOM_NAME}>{t("profile.fields.otherName")}</option>
      </select>
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
