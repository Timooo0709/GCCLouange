"use client"

import { useEffect, useState } from "react"
import { PlanningTable } from "@/components/planning/PlanningTable"
import { fetchInterfranco } from "@/lib/planning/sheets"

const COLS = ["Date","Présidence","Choriste 1","Choriste 2","Piano","Guitare","Cajon/Batt.","Sono+Live","PPT","Orateur","Trad."]
const COLOR = "#9d3c63"

export default function InterfrancoPage() {
  const [rows, setRows] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInterfranco().then(d => { if (d.length) setRows(d) }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Interfranco</h2>
        {loading && <span className="text-xs text-muted-foreground">Chargement…</span>}
      </div>

      <PlanningTable cols={COLS} rows={rows} color={COLOR} minWidth={700} groupBy="year" />
    </div>
  )
}
