"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useScrollDirection } from "@/hooks/useScrollDirection"
import { useRef, useEffect, useState } from "react"

const TABS = [
  { label: "Accueil", href: "/planning" },
  { label: "Culte Franco", href: "/planning/culte" },
  { label: "Prépa. Table", href: "/planning/table" },
  { label: "Groupes", href: "/planning/groupes" },
  { label: "EDD", href: "/planning/edd" },
  { label: "Campus", href: "/planning/campus" },
  { label: "Intergroupe", href: "/planning/intergroupe" },
  { label: "Interfranco", href: "/planning/interfranco" },
]

export function PlanningTabs() {
  const pathname = usePathname() || ""
  const scrollVisible = useScrollDirection()
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const navRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false })

  const isTabActive = (href: string) =>
    href === "/planning"
      ? pathname === "/planning" || pathname === "/planning/"
      : pathname.startsWith(href)

  useEffect(() => {
    const activeIndex = TABS.findIndex((tab) => isTabActive(tab.href))
    const el = tabRefs.current[activeIndex]
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth, ready: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <div className={`sticky top-[calc(var(--nav-h)-1px)] z-40 border-b border-border bg-background/95 backdrop-blur-md print:hidden transition-transform duration-300 ${scrollVisible ? "translate-y-0" : "-translate-y-[calc(100%+var(--nav-h))]"}`}>
      <div className="max-w-[1080px] mx-auto px-4">
        <nav ref={navRef} className="relative flex overflow-x-auto gap-0" style={{ scrollbarWidth: "none" }}>
          {TABS.map((tab, i) => {
            const active = isTabActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                ref={(el) => { tabRefs.current[i] = el }}
                className={`flex-shrink-0 px-4 py-3 text-[12.5px] font-semibold transition-colors duration-150 whitespace-nowrap ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
          {/* Indicateur glissant — placé DANS le <nav> scrollable : il suit le
              défilement des onglets et est rogné par overflow-x. Hors du nav, son
              left = offsetLeft des onglets de droite (Campus/Inter…) débordait la
              page sur téléphone (scroll horizontal). */}
          {indicator.ready && (
            <div
              className="absolute bottom-0 h-[2px] bg-primary rounded-full transition-all duration-200"
              style={{ left: indicator.left, width: indicator.width }}
            />
          )}
        </nav>
      </div>
    </div>
  )
}
