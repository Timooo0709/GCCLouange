import { useState } from "react";
import { AlertCircle, X, Send } from "lucide-react";

export function BugReportButton({ song }: { song: string }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    setStatus('done')
  }

  if (status === 'done') return (
    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
      <span className="text-green-500">✓</span> Signalement envoyé, merci !
    </p>
  )

  return (
    <>
      {/* Bouton */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground text-red-500 hover:text-foreground transition-colors"
      >
        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
        Signaler un problème
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Fenêtre */}
          <div className="relative w-full max-w-sm bg-background border border-border rounded-lg shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  Signaler un problème
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Résumé
                </label>
                <input
                  name="title"
                  defaultValue={`Problème avec : ${song}`}
                  required
                  className="w-full px-3 py-1.5 text-sm border border-border rounded bg-muted/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Détails <span className="font-normal">(optionnel)</span>
                </label>
                <textarea
                  name="description"
                  placeholder="Décris le problème..."
                  rows={3}
                  className="w-full px-3 py-1.5 text-sm border border-border rounded bg-muted/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Ton email <span className="font-normal">(optionnel)</span>
                </label>
                <input
                  name="userEmail"
                  type="email"
                  placeholder="pour te répondre"
                  className="w-full px-3 py-1.5 text-sm border border-border rounded bg-muted/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {status === 'loading' ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}