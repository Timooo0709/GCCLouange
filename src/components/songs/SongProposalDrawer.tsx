"use client";

import { useState } from "react";
import { CheckCircle2, Music4 } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { createSongProposal } from "@/lib/firebase/songProposals";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

/** Bouton « Proposer un nouveau chant » + tiroir de saisie.
 *  Visible uniquement pour les utilisateurs connectés. La proposition est
 *  envoyée aux admins (inbox in-app), aucun fichier n'est stocké. */
export function SongProposalDrawer() {
  const { user, profile, loading } = useProfile();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (loading || !user) return null;

  const authorName =
    profile && (profile.firstName || profile.lastName)
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : user.email ?? "Utilisateur";

  function reset() {
    setTitle("");
    setYoutubeUrl("");
    setPdfUrl("");
    setError("");
    setDone(false);
  }

  async function handleSubmit() {
    setError("");
    if (!title.trim()) {
      setError("Donne le nom du chant.");
      return;
    }
    if (!youtubeUrl.trim()) {
      setError("Ajoute le lien YouTube du chant.");
      return;
    }
    if (!isHttpUrl(youtubeUrl)) {
      setError("Le lien YouTube doit commencer par http:// ou https://");
      return;
    }
    if (pdfUrl.trim() && !isHttpUrl(pdfUrl)) {
      setError("Le lien de la partition doit commencer par http:// ou https://");
      return;
    }
    setSaving(true);
    try {
      await createSongProposal({
        title: title.trim(),
        youtubeUrl: youtubeUrl.trim(),
        pdfUrl: pdfUrl.trim(),
        authorId: user!.uid,
        authorName,
      });
      setDone(true);
    } catch {
      setError(
        "Envoi impossible. Vérifie ta connexion (et que les règles Firestore sont publiées)."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary hover:underline"
      >
        <Music4 className="h-4 w-4" />
        Proposer un nouveau chant
      </button>

      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Proposer un nouveau chant</DrawerTitle>
          <DrawerDescription>
            Ta proposition est envoyée aux administrateurs, qui l&apos;ajouteront au
            répertoire.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          {done ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-sm text-foreground">
                Merci ! Ta proposition a bien été envoyée aux admins.
              </p>
              <Button onClick={() => setOpen(false)} className="h-11">
                Fermer
              </Button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Nom du chant <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex. Tu es fidèle"
                  className="h-11"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Lien YouTube <span className="text-destructive">*</span>
                </label>
                <Input
                  type="url"
                  inputMode="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                  className="h-11"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Lien de la partition PDF{" "}
                  <span className="text-muted-foreground/70">(optionnel)</span>
                </label>
                <Input
                  type="url"
                  inputMode="url"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                  placeholder="https://… (Google Drive, etc.)"
                  className="h-11"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="h-11"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="h-11"
                >
                  {saving ? "Envoi…" : "Envoyer aux admins"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
