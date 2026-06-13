"use client";

import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, type User } from "firebase/auth";
import { auth } from "./config";
import {
  FS_BASE,
  authHeader,
  checkRest,
  toFsFields,
  fromFsValue,
  type RawDoc,
} from "./setlists";
import { useAuth } from "./auth";
import type { UserProfile } from "@/types/user";

export async function signUp(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ─── Profils Firestore (collection users/{uid}) ──────────────────────────────

function fromFsProfile(raw: RawDoc): UserProfile {
  const uid = raw.name.split("/").pop()!;
  const data = Object.fromEntries(
    Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)])
  );
  return {
    uid,
    email: (data.email as string) ?? "",
    firstName: (data.firstName as string) ?? "",
    lastName: (data.lastName as string) ?? "",
    planningName: (data.planningName as string) ?? "",
    roles: (data.roles as UserProfile["roles"]) ?? [],
    lieux: (data.lieux as UserProfile["lieux"]) ?? [],
    edd: (data.edd as boolean) ?? false,
    eddRoles: (data.eddRoles as UserProfile["eddRoles"]) ?? [],
    groupe: (data.groupe as UserProfile["groupe"]) ?? null,
    groupeMusicien: (data.groupeMusicien as boolean) ?? false,
    annonces: (data.annonces as string[]) ?? [],
  };
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/users/${uid}`, { headers });
  if (!res.ok) return null;
  const raw = (await res.json()) as RawDoc;
  return fromFsProfile(raw);
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const { uid, ...data } = profile;
  const headers = await authHeader();
  // PATCH sans updateMask crée ou remplace le document users/{uid}
  const res = await fetch(`${FS_BASE}/users/${uid}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(data as Record<string, unknown>) }),
  });
  await checkRest(res);
  profileCache.set(uid, profile);
}

/** Tous les profils, triés par nom — réservé à la page admin. */
export async function listProfiles(): Promise<UserProfile[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId: "users" }] },
    }),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows
    .filter((r) => r.document)
    .map((r) => fromFsProfile(r.document!))
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName, "fr") ||
        a.firstName.localeCompare(b.firstName, "fr")
    );
}

// ─── Inscriptions ouvertes / fermées (doc config/app, modifiable par les admins) ──

export async function getRegistrationOpen(): Promise<boolean> {
  // Lecture publique : la page d'inscription est consultée sans compte
  const res = await fetch(`${FS_BASE}/config/app`);
  if (!res.ok) return true; // doc absent → inscriptions ouvertes
  const raw = (await res.json()) as RawDoc;
  const v = raw.fields?.registrationOpen;
  return v ? fromFsValue(v) !== false : true;
}

export async function setRegistrationOpen(open: boolean): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(
    `${FS_BASE}/config/app?updateMask.fieldPaths=registrationOpen`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ fields: { registrationOpen: { booleanValue: open } } }),
    }
  );
  await checkRest(res);
}

// ─── Hook useProfile (cache partagé entre composants) ────────────────────────

const profileCache = new Map<string, UserProfile | null>();

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    if (profileCache.has(user.uid)) {
      setProfile(profileCache.get(user.uid) ?? null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    getProfile(user.uid)
      .then((p) => {
        profileCache.set(user.uid, p);
        setProfile(p);
      })
      .finally(() => setProfileLoading(false));
  }, [user, authLoading]);

  return { user, profile, loading: authLoading || profileLoading };
}
