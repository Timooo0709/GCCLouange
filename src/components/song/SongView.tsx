"use client";
import localFont from "next/font/local";
import { ChordLine } from "@/components/song/ChordLine";
import { JianpuLine } from "@/components/song/JianpuLine";
import type { ChordProAST, ChordProSection, Token } from "@/types/chordPro";
import { useTranslation } from "react-i18next";
import { formatSectionName } from "@/lib/chordpro/parser";

// ---------------------------------------------------------------------------
// Thèmes et styles de sections
// ---------------------------------------------------------------------------

const LANG_THEME = {
  fr: {
    accent: "var(--fr-accent)",
    boxFill: "var(--fr-box-fill)",
    boxBorder: "var(--fr-box-border)",
  },
  zh: {
    accent: "var(--zh-accent)",
    boxFill: "var(--zh-box-fill)",
    boxBorder: "var(--zh-box-border)",
  },
} as const;

const FILLED_BOX = new Set(["chorus", "prechorus", "final", "coda"]);
const OUTLINE_BOX = new Set(["bridge"]);

const KaiTiFont = localFont({ src: "../../../public/fonts/KaiTi.ttf" });
const Hans = localFont({ src: "../../../public/fonts/Han.otf" });

function getSectionStyle(type: string, isZh: boolean): React.CSSProperties {
  const { accent, boxFill, boxBorder } = LANG_THEME[isZh ? "zh" : "fr"];

  const base: React.CSSProperties = {
    "--sec-c": accent,
    borderRadius: "0 8px 8px 0",
    padding: "10px 16px 12px",
    marginLeft: "-2px",
    marginBottom: "10px",
  } as React.CSSProperties;

  if (FILLED_BOX.has(type)) {
    return {
      ...base,
      background: boxFill,
      borderTop: `0.5px solid ${boxBorder}`,
      borderRight: `0.5px solid ${boxBorder}`,
      borderBottom: `0.5px solid ${boxBorder}`,
      borderLeft: `3px solid ${accent}`,
    };
  }

  if (OUTLINE_BOX.has(type)) {
    return {
      ...base,
      borderTop: `0.5px solid ${accent}`,
      borderRight: `0.5px solid ${accent}`,
      borderBottom: `0.5px solid ${accent}`,
      borderLeft: `3px solid ${accent}`,
    };
  }

  // Pas de boîte pour les sections plain (verse, etc.)
  return { "--sec-c": accent } as React.CSSProperties;
}

// ---------------------------------------------------------------------------
// Rendu colonne par colonne pour le chinois
// ---------------------------------------------------------------------------

function isCJK(ch: string) {
  const cp = ch.codePointAt(0) ?? 0;
  return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf);
}

type Column = { char: string; chord: string | null; py: string };

function buildColumns(tokens: Token[], pinyin: string | null): Column[] {
  const pyWords = pinyin?.split(/\s+/).filter(Boolean) ?? [];
  let pyIdx = 0;
  let pendingChord: string | null = null;
  const cols: Column[] = [];

  for (const tok of tokens) {
    if (tok.type === "chord") {
      pendingChord = tok.value;
    } else {
      [...tok.value].forEach((ch, ci) => {
        cols.push({
          char: ch,
          chord: ci === 0 ? pendingChord : null,
          py: isCJK(ch) ? (pyWords[pyIdx++] ?? "") : "",
        });
        if (ci === 0) pendingChord = null;
      });
    }
  }

  if (pendingChord) cols.push({ char: " ", chord: pendingChord, py: "" });
  return cols;
}

interface ZhLineProps {
  tokens: Token[];
  pinyin: string | null;
  showChords: boolean;
  showPinyin: boolean;
}

function ZhLine({ tokens, pinyin, showChords, showPinyin }: ZhLineProps) {
  const cols = buildColumns(tokens, pinyin);
  const hasAnyChord = showChords && cols.some((c) => c.chord !== null);

  return (
    <div className="flex flex-wrap items-start mb-[3px]" style={{ fontSize: "0.88rem" }}>
      {cols.map((col, i) => {
        if (!showChords && col.char === " " && col.chord !== null) return null;
        const minWidth = isCJK(col.char)
          ? "1.6em"
          : col.chord
          ? `${(col.chord.length + 0.5) * 0.62}em`
          : undefined;

        return (
          <span
            key={i}
            style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", minWidth }}
          >
            {showChords && (
              <span
                style={{
                  fontFamily: '"JetBrains Mono", "Courier New", monospace',
                  fontWeight: 700,
                  fontSize: "0.9em",
                  lineHeight: "0.7",
                  minHeight: hasAnyChord ? "1.1em" : undefined,
                  color: "var(--jianpu-color, #b3261d)",
                  visibility: col.chord ? "visible" : "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                {col.chord ?? "x"}
              </span>
            )}
            <span className = { Hans.className } style={{ fontSize: "1em", lineHeight: 1.35 }}>
              {col.char}
            </span>
            {showPinyin && (
              <span
                style={{
                  fontSize: "0.6em",
                  lineHeight: 1.2,
                  color: "var(--muted-foreground)",
                  whiteSpace: "nowrap",
                }}
              >
                {col.py || " "}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionView
// ---------------------------------------------------------------------------

interface SectionViewProps {
  section: ChordProSection;
  language: "fr" | "zh";
  showChords: boolean;
  showPinyin: boolean;
  useJianpu: boolean;
  note?: string;
}

function SectionView({ section, language, showChords, showPinyin, useJianpu, note }: SectionViewProps) {
  const { t } = useTranslation();
  const isZh = language === "zh";
  const label = formatSectionName(section, t);

  return (
    <div className="mb-5 print:mb-4" style={{ breakInside: "avoid", ...getSectionStyle(section.type, isZh) }}>
      {/* Label de section */}
      <div className="font-section mb-1.5" style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span
          aria-hidden="true"
          style={{
            width: 16,
            height: 2,
            background: "var(--sec-c, currentColor)",
            borderRadius: 2,
            flexShrink: 0,
            display: "inline-block",
          }}
        />
        <span>
          {label}
          {note && (
            <span className="ml-2 normal-case font-normal text-muted-foreground tracking-normal text-xs">
              — {note}
            </span>
          )}
        </span>
      </div>

      {/* Lignes */}
      <div>
        {section.lines.map((line, i) => {
          if (line.tokens.length === 0 && !line.jianpu) {
            return <div key={i} className="h-5" />;
          }

          if (isZh && useJianpu) {
            return <JianpuLine key={i} line={line} showChords={showChords} showPinyin={showPinyin} />;
          }

          if (isZh) {
            return (
              <ZhLine
                key={i}
                tokens={line.tokens}
                pinyin={line.pinyin ?? null}
                showChords={showChords}
                showPinyin={showPinyin}
              />
            );
          }

          return <ChordLine key={i} tokens={line.tokens} showChords={showChords} />;
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SongView
// ---------------------------------------------------------------------------

export interface SongViewProps {
  ast: ChordProAST;
  showChords?: boolean;
  showPinyin?: boolean;
  useJianpu?: boolean;
  structureOverride?: string[] | null;
  sectionNotes?: Record<string, string>;
}

export function SongView({
  ast,
  showChords = true,
  showPinyin = false,
  useJianpu = false,
  structureOverride = null,
  sectionNotes = {},
}: SongViewProps) {
  const { t } = useTranslation();
  const isZh = ast.metadata.language === "zh";
  const canUseJianpu = isZh && useJianpu;
  const langAccent = isZh ? "var(--jianpu-color)" : "var(--chord-color)";
  
  const sections =
    structureOverride && !canUseJianpu
      ? structureOverride
          .map((id) => ast.sections.find((s) => s.id === id))
          .filter((s): s is ChordProSection => s !== undefined)
      : ast.sections;
      
  return (
    <div className="max-w-2xl print:max-w-none">
      {/* En-tête */}
      <div className="mb-0 pb-3 print:mb-3 border-b border-border">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <h1 className={`text-[26px] font-extrabold text-foreground leading-[1.05] tracking-[-0.4px] uppercase ${isZh ? KaiTiFont.className : ""}`}>
              {ast.metadata.title}
            </h1>
            {ast.metadata.titlePinyin && (
              <p className="text-muted-foreground text-[13px] mt-1 font-medium">
                {ast.metadata.titlePinyin}
              </p>
            )}
            <p className="text-muted-foreground text-[13px] mt-1">{ast.metadata.artist}</p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0 pt-1">
            {ast.metadata.key && (
              <span
                className="font-mono font-bold text-[14px] rounded-full px-3 py-[3px] border-[1.5px] leading-none"
                style={{ color: langAccent, borderColor: langAccent }}
              >
                {canUseJianpu ? ast.metadata.jianpuKey ?? `1=${ast.metadata.key}` : ast.metadata.key}
              </span>
            )}
            {ast.metadata.tempo && (
              <span className="text-muted-foreground text-[11px] font-medium flex items-baseline gap-0.5">
                <span className="text-foreground/70 text-[15px] leading-none">♩</span>
                {` = ${ast.metadata.tempo}`}
              </span>
            )}
          </div>
        </div>

        {canUseJianpu && structureOverride && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded">
            {t("songs.view.jianpuWarning")}
          </p>
        )}
      </div>

      {/* Ligne ORDRE */}
      <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 pt-2 pb-3">
        <span
          className="text-[8px] font-bold tracking-[1.4px] uppercase mr-1.5 shrink-0"
          style={{ color: langAccent }}
        >
          ORDRE
        </span>
        {sections.map((section, i) => (
          <span key={`ord-${section.id}-${i}`} className="text-[11px] text-muted-foreground">
            {i > 0 && <span className="mx-0.5 opacity-40">·</span>}
            {formatSectionName(section, t)}
          </span>
        ))}
      </div>

      {/* Corps */}
      <div>
        {sections.map((section, i) => (
          <SectionView
            key={`${section.id}-${i}`}
            section={section}
            language={ast.metadata.language}
            showChords={showChords}
            showPinyin={isZh ? showPinyin : false}
            useJianpu={canUseJianpu}
            note={sectionNotes[section.id]}
          />
        ))}
      </div>
    </div>
  );
}