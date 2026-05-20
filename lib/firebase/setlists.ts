import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import type { SetlistItem } from "@/lib/types";

// ─── Categories ───────────────────────────────────────────────────────────────

export const RESTRICTED_CATEGORIES = [
  "Culte Francophone",
  "Intergroupe",
  "Interfranco",
  "Campus",
] as const;

export const FREE_CATEGORIES = [
  "Groupe Paix",
  "Groupe Fidélité",
  "Groupe Bonté",
  "中班",
  "大班",
  "高班",
] as const;

export const ALL_CATEGORIES = [...RESTRICTED_CATEGORIES, ...FREE_CATEGORIES];

export function isRestricted(category: string): boolean {
  return (RESTRICTED_CATEGORIES as readonly string[]).includes(category);
}

// ─── Firestore types ──────────────────────────────────────────────────────────

export interface FSSetlist {
  id: string;
  title: string;
  leader: string;
  category: string;
  date: string;
  language: "fr" | "zh" | "mixed";
  notes: string;
  createdAt: Timestamp | null;
  items: SetlistItem[];
  isDraft?: boolean;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getSetlists(): Promise<FSSetlist[]> {
  const q = query(collection(db, "setlists"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FSSetlist));
}

export async function getSetlist(id: string): Promise<FSSetlist | null> {
  const snap = await getDoc(doc(db, "setlists", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FSSetlist;
}

export async function createSetlist(
  data: Omit<FSSetlist, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "setlists"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSetlist(
  id: string,
  data: Partial<Omit<FSSetlist, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "setlists", id), data as Record<string, unknown>);
}

export async function deleteSetlist(id: string): Promise<void> {
  await deleteDoc(doc(db, "setlists", id));
}
