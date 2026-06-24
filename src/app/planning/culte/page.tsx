"use client"

import { useEffect, useState } from "react"
import { FilterButtons } from "@/components/planning/FilterButtons"
import { PlanningTable } from "@/components/planning/PlanningTable"
import { filterByTri, getCurrentTri, isFirstSundayOfMonth } from "@/lib/planning/utils"
import { CULTE_FALLBACK } from "@/lib/planning/data"
import { fetchCulte } from "@/lib/planning/sheets"
import { useProfile } from "@/lib/firebase/users"
import { isAdminUser } from "@/lib/access"
import {
  PUBLISHABLE_PLANNINGS,
  canPublishPlanning,
  getPublishedQuarters,
  triVisibilities,
  TRI_ORDER,
} from "@/lib/planning/releases"

const COLS = ["Date","Présidence","Choriste 1","Choriste 2","Piano","Guitare","Batterie","Sono","PPT","Orateur","Trad."]
const COLOR = "#2d5a65"
const CULTE = PUBLISHABLE_PLANNINGS.find(p => p.key === "culte")!

export default function CultePage() {
  const { user, profile } = useProfile()
  const [rows, setRows] = useState(CULTE_FALLBACK)
  const [tri, setTri] = useState(getCurrentTri())
  const [loading, setLoading] = useState(true)
  const [published, setPublished] = useState<string[]>([])

  useEffect(() => {
    fetchCulte().then(d => { if (d.length) setRows(d) }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    getPublishedQuarters("culte", new Date().getFullYear()).then(setPublished)
  }, [])

  // Trimestres futurs non publiés : masqués aux membres, marqués pour les publieurs.
  const canPublish = canPublishPlanning(CULTE, isAdminUser(user), profile?.notify ?? [])
  const vis = triVisibilities(TRI_ORDER, published, getCurrentTri(), canPublish)
  const visibleTris = vis.filter(v => v.visible).map(v => v.tri)
  const unpublishedTris = vis.filter(v => v.unpublished).map(v => v.tri)
  const effTri = visibleTris.includes(tri) ? tri : getCurrentTri()

  const filtered = filterByTri(rows, effTri)

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Culte Franco</h2>
        {loading && <span className="text-xs text-muted-foreground">Chargement…</span>}
      </div>

      <FilterButtons options={visibleTris} active={effTri} onChange={setTri} color={COLOR} unpublished={unpublishedTris} />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-3 h-3 rounded-sm" style={{ background: `${COLOR}26`, border: `1px solid ${COLOR}4d` }} />
        Dimanche de la semaine courante
      </div>

      <PlanningTable
        cols={COLS}
        rows={filtered}
        color={COLOR}
        minWidth={680}
        dateBadge={(row, all) =>
          isFirstSundayOfMonth(row[0], all) ? (
            <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 mt-0.5">
              Sainte Cène
            </span>
          ) : null
        }
      />
    </div>
  )
}
