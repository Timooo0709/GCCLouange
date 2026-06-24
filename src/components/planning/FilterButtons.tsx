"use client"

import { Lock } from "lucide-react"

interface FilterButtonsProps {
  options: string[]
  active: string
  onChange: (v: string) => void
  className?: string
  color?: string
  /** Options à marquer « non publié » (cadenas) — visibles par les responsables uniquement. */
  unpublished?: readonly string[]
}

export function FilterButtons({ options, active, onChange, className, color, unpublished }: FilterButtonsProps) {
  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 scrollbar-none ${className ?? ""}`}>
      {options.map(opt => {
        const unpub = unpublished?.includes(opt)
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            title={unpub ? "Non publié — visible par les responsables uniquement" : undefined}
            className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer ${
              opt === active
                ? color ? "text-white border-transparent" : "bg-primary border-primary text-primary-foreground"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
            }`}
            style={opt === active && color ? { background: color, borderColor: color } : undefined}
          >
            {opt}
            {unpub && <Lock className="h-3 w-3 opacity-70" />}
          </button>
        )
      })}
    </div>
  )
}
