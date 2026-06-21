"use client"

import { useEffect, useState } from "react"
import { PlanningTable } from "@/components/planning/PlanningTable"
import { fetchIntergroupe } from "@/lib/planning/sheets"

const COLS = ["Date","Présidence","Choriste 1","Choriste 2","Choriste 3","Piano","Guitare","Cajon/Batt.","Sono+Live","PPT","Orateur","Trad."]
const COLOR = "#a87b0f"

export default function IntergroupePage() {
  const [rows, setRows] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchIntergroupe().then(d => { if (d.length) setRows(d) }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Intergroupe</h2>
        {loading && <span className="text-xs text-muted-foreground">Chargement…</span>}
      </div>

      <PlanningTable cols={COLS} rows={rows} color={COLOR} minWidth={760} groupBy="year" />
    </div>
  )
}
