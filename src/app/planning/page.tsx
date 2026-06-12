"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { currentSundayStr, fdLong, MOIS, getMois, EDD_PERIODES } from "@/lib/planning/utils"
import {
  CULTE_FALLBACK, FIDELITE_FALLBACK, FIDELITE_MUSIC_FALLBACK,
  PAIX_FALLBACK, BONTE_FALLBACK, DEJEUNER_FALLBACK, EDD_FALLBACK, CAMP_LOUANGE_FALLBACK
} from "@/lib/planning/data"
import { fetchCulte, fetchDejeuner, fetchPaix, fetchFidelite, fetchFideliteMusic, fetchBonte, fetchEDD, fetchCampus } from "@/lib/planning/sheets"
import type { EddDataStructure, CampusSeance } from "@/lib/planning/utils"
import { useProfile } from "@/lib/firebase/users"
import { findMyServices, type PlanningData } from "@/lib/planning/names"

function val(v: string) { return v?.trim() || "—" }

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20 shrink-0">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}

function SectionBlock({ dot, label, children }: { dot: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-4 py-3 border-b border-border last:border-b-0">
      <div className="w-2 h-2 rounded-full mt-[7px] shrink-0" style={{ background: dot }} />
      <div className="w-24 shrink-0 text-sm font-semibold text-foreground pt-px">{label}</div>
      <div className="flex-1 space-y-1">{children}</div>
    </div>
  )
}

function GroupBlock({ badge, children }: { badge: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 pb-3 border-b border-dashed border-border last:mb-0 last:pb-0 last:border-0">
      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground mb-2">{badge}</span>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export default function PlanningAccueil() {
  const { user, profile } = useProfile()
  const [culte, setCulte] = useState(CULTE_FALLBACK)
  const [dej, setDej] = useState(DEJEUNER_FALLBACK)
  const [paix, setPaix] = useState(PAIX_FALLBACK)
  const [fid, setFid] = useState(FIDELITE_FALLBACK)
  const [fidM, setFidM] = useState(FIDELITE_MUSIC_FALLBACK)
  const [bonte, setBonte] = useState(BONTE_FALLBACK)
  const [edd, setEdd] = useState<EddDataStructure>(EDD_FALLBACK)
  const [campus, setCampus] = useState<CampusSeance[]>(CAMP_LOUANGE_FALLBACK)

  useEffect(() => {
    fetchCulte().then(d => { if (d.length) setCulte(d) })
    fetchDejeuner().then(d => { if (d.length) setDej(d) })
    fetchPaix().then(d => { if (d.length) setPaix(d) })
    fetchFidelite().then(d => { if (d.length) setFid(d) })
    fetchFideliteMusic().then(d => { if (d.length) setFidM(d) })
    fetchBonte().then(d => { if (d.length) setBonte(d) })
    fetchEDD().then(d => setEdd(d))
    fetchCampus().then(({ louange }) => { if (louange.length) setCampus(louange) }).catch(() => {})
  }, [])

  // Prochain service de la personne connectée (d'après son nom de planning)
  const nextServices = useMemo(() => {
    if (!user || !profile?.planningName) return null
    const data: PlanningData = { culte, dejeuner: dej, paix, fidelite: fid, fideliteMusic: fidM, bonte, edd, campus }
    const today = new Date().toISOString().split("T")[0]
    const upcoming = findMyServices(data, profile.planningName).filter(e => e.date >= today)
    if (!upcoming.length) return null
    return upcoming.filter(e => e.date === upcoming[0].date)
  }, [user, profile, culte, dej, paix, fid, fidM, bonte, edd, campus])

  const sun = currentSundayStr()
  const sunParts = sun.split("-")
  const sunDate = new Date(+sunParts[0], +sunParts[1]-1, +sunParts[2])
  const sunLabel = `${sunDate.getDate()} ${MOIS[sunDate.getMonth()]} ${sunDate.getFullYear()}`

  const cRow = culte.find(r => r[0] === sun) ?? null
  const dRow = dej.find(r => r[0] === sun) ?? null
  const paixRow = paix.find(r => r[0] === sun) ?? null
  const fidRow = fid.find(r => r[0] === sun) ?? null
  const fidMRow = fidM.find(r => r[0] === sun) ?? null
  const bonteRow = bonte.find(r => r[0] === sun) ?? null

  const m = +sunParts[1]
  const pk = EDD_PERIODES[m<=2?0:m<=4?1:m<=6?2:m<=8?3:m<=10?4:5]
  const eddP = edd[pk]?.classes ?? null
  const eddZb = eddP?.["中班"]?.find(r => r[0] === sun) ?? null
  const eddDb = eddP?.["大班"]?.find(r => r[0] === sun) ?? null
  const eddGb = eddP?.["高班"]?.find(r => r[0] === sun) ?? null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Intro */}
      <div className="bg-card border border-border rounded-xl p-5 text-center space-y-2">
        <p className="text-xs text-muted-foreground font-medium italic">Bienvenue</p>
        <h1 className="text-lg font-bold text-foreground">GCC — Planning des services</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Centralisez et consultez en temps réel tous les plannings des services.
        </p>
      </div>

      {/* Prochain service de la personne connectée */}
      {nextServices && (
        <Link
          href="/mes-services"
          className="block bg-card border border-primary/30 rounded-xl p-4 hover:border-primary/60 transition-colors"
        >
          <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
            Ton prochain service
          </p>
          <p className="text-sm font-semibold text-foreground">
            {fdLong(nextServices[0].date)} —{" "}
            {nextServices.map(e => `${e.service} (${e.role})`).join(" · ")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Voir tous mes services →</p>
        </Link>
      )}

      {/* Ce dimanche */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Ce dimanche — {sunLabel}
        </p>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Culte Franco */}
          <SectionBlock dot="#2d5a65" label="Culte Franco">
            {cRow ? (
              <>
                <InfoRow label="Présidence" value={val(cRow[1])} />
                {(cRow[2] || cRow[3]) && (
                  <InfoRow label="Choristes" value={[cRow[2],cRow[3]].filter(v=>v?.trim()).join(", ")} />
                )}
                <InfoRow label="Piano" value={val(cRow[4])} />
                <InfoRow label="Guitare" value={val(cRow[5])} />
                <InfoRow label="Batterie" value={val(cRow[6])} />
                <InfoRow label="Sono" value={val(cRow[7])} />
                <InfoRow label="PPT" value={val(cRow[8])} />
                <InfoRow label="Orateur" value={val(cRow[9])} />
                {cRow[10] && <InfoRow label="Trad." value={val(cRow[10])} />}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Données à venir</p>
            )}
          </SectionBlock>

          {/* Prépa Table */}
          <SectionBlock dot="#c87941" label="Prépa. Table">
            {dRow?.[ 1]?.trim() ? (
              <p className="text-sm text-foreground">{dRow[1]}</p>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </SectionBlock>

          {/* Groupes */}
          <SectionBlock dot="#6b4a8e" label="Groupes">
            <GroupBlock badge="Paix">
              <InfoRow label="Présidence" value={val(paixRow?.[1] ?? "")} />
              <InfoRow label="Musiciens" value={val(paixRow?.[2] ?? "")} />
              <InfoRow label="Orateur" value={val(paixRow?.[3] ?? "")} />
            </GroupBlock>
            <GroupBlock badge="Fidélité">
              <InfoRow label="Présidence" value={val(fidRow?.[1] ?? "")} />
              {fidMRow && (
                <InfoRow label="Musiciens" value={[fidMRow[2],fidMRow[3],fidMRow[4]].filter(Boolean).join(", ")} />
              )}
              <InfoRow label="Orateur" value={val(fidRow?.[2] ?? "")} />
            </GroupBlock>
            <GroupBlock badge="Bonté">
              <InfoRow label="Présidence" value={val(bonteRow?.[1] ?? "")} />
              <InfoRow label="Musiciens" value={val(bonteRow?.[2] ?? "")} />
              <InfoRow label="Orateur" value={val(bonteRow?.[3] ?? "")} />
            </GroupBlock>
          </SectionBlock>

          {/* EDD */}
          <SectionBlock dot="#3b6d11" label="EDD">
            {[["中班", eddZb], ["大班", eddDb], ["高班", eddGb]].map(([cls, row]) => (
              <GroupBlock key={cls as string} badge={cls as string}>
                <InfoRow label="Présidence" value={val((row as string[]|null)?.[1] ?? "")} />
                <InfoRow label="Suppléant" value={val((row as string[]|null)?.[2] ?? "")} />
                <InfoRow label="Piano" value={val((row as string[]|null)?.[3] ?? "")} />
                <InfoRow label="Cajon" value={val((row as string[]|null)?.[4] ?? "")} />
                <InfoRow label="Guitare" value={val((row as string[]|null)?.[5] ?? "")} />
              </GroupBlock>
            ))}
          </SectionBlock>
        </div>
      </div>

      {/* Verset */}
      <blockquote className="bg-secondary rounded-xl p-5 border border-border">
        <p className="text-sm text-muted-foreground italic leading-relaxed mb-3">
          "Tout ce que vous faites, faites-le de bon cœur, comme pour le Seigneur et non pour des hommes,
          sachant que vous recevrez du Seigneur l'héritage pour récompense. Servez Christ, le Seigneur."
        </p>
        <footer className="text-xs font-semibold text-primary text-right">— Colossiens 3 : 23-24</footer>
      </blockquote>
    </div>
  )
}
