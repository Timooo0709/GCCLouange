"use client";

import { ChordLine } from "@/components/song/ChordLine";
import { JianpuLine } from "@/components/song/JianpuLine";
import { resolvePinyin, extractChinese } from "@/lib/pinyin";
import type { ChordProAST, ChordProSection } from "@/lib/types";

// --- Libellés de section traduits ---

const SECTION_LABELS: Record<string, string> = {
  verse: "Couplet",
  chorus: "Refrain",
  bridge: "Pont",
  intro: "Intro",
  outro: "Outro",
  prechorus: "Pré-refrain",
  other: "Section",
};

// --- Composant section ---

interface SectionViewProps {
  section: ChordProSection;
  language: "fr" | "zh";
  showChords: boolean;
  showPinyin: boolean;
  useJianpu: boolean;
  note?: string;
}

function SectionView({ section, language, showChords, showPinyin, useJianpu, note }: SectionViewProps) {
  const isZh = language === "zh";
  const label = section.name || SECTION_LABELS[section.type] || section.type;

  return (
    <div className="mb-5 print:mb-4" style={{ breakInside: "avoid" }}>
      {/* En-tête de section */}
      <div className="font-section text-xs font-bold uppercase tracking-widest text-section dark:text-orange-400 mb-1">
        {label}
        {note && (
          <span className="ml-2 normal-case font-normal text-muted-foreground tracking-normal">
            — {note}
          </span>
        )}
      </div>

      {/* Lignes de la section */}
      <div>
        {section.lines.map((line, i) => {
          // Ligne vide (tokens vides)
          if (line.tokens.length === 0 && !line.jianpu) {
            return <div key={i} className="h-5" />;
          }

          const lyricsText = extractChinese(line.tokens);

          if (isZh && useJianpu) {
            // Mode 简谱 : 4 couches
            return (
              <JianpuLine
                key={i}
                line={line}
                showChords={showChords}
                showPinyin={showPinyin}
              />
            );
          }

          if (isZh && !useJianpu) {
            // Mode chinois standard : paroles + accords + pinyin optionnel
            const pinyinText = resolvePinyin(lyricsText, line.pinyin);

            return (
              <div key={i} className="mb-1" >
                <ChordLine tokens={line.tokens} showChords={showChords} />
                {showPinyin && pinyinText && (
                  <div
                    className="font-mono text-muted-foreground select-text"
                    style={{ fontSize: "0.75rem", paddingLeft: "0", marginTop: "-0.1em", paddingBottom: "0.1em" }}
                  >
                    {pinyinText}
                  </div>
                )}
              </div>
            );
          }

          // Mode français : paroles + accords
          return (
            <ChordLine key={i} tokens={line.tokens} showChords={showChords} />
          );
        })}
      </div>
    </div>
  );
}

// --- Composant principal SongView ---

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
  const isZh = ast.metadata.language === "zh";
  const canUseJianpu = isZh && useJianpu;

  // Sections à afficher dans l'ordre
  const sections =
    structureOverride && !canUseJianpu
      ? structureOverride
          .map((id) => ast.sections.find((s) => s.id === id))
          .filter((s): s is ChordProSection => s !== undefined)
      : ast.sections;

  return (
    <div className="max-w-2xl print:max-w-none">
      {/* En-tête du chant */}
      <div className="mb-6 pb-4 print:mb-3 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground leading-tight">
          {ast.metadata.title}
        </h1>
        {ast.metadata.titlePinyin && (
          <p className="text-muted-foreground text-sm mt-0.5">
            {ast.metadata.titlePinyin}
          </p>
        )}
        <p className="text-muted-foreground text-sm mt-1">
          {ast.metadata.artist}
          {ast.metadata.key && (
            <span className="ml-3 font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              {canUseJianpu
                ? ast.metadata.jianpuKey ?? `1=${ast.metadata.key}`
                : ast.metadata.key}
            </span>
          )}
          {ast.metadata.tempo && (
            <span className="ml-2 text-xs text-muted-foreground">
              ♩ = {ast.metadata.tempo}
            </span>
          )}
        </p>

        {/* Avertissement structure désactivée en mode 简谱 */}
        {canUseJianpu && structureOverride && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded">
            La structure n&apos;est pas modifiable en mode 简谱 (chant affiché dans son intégralité).
          </p>
        )}
      </div>

      {/* Corps : sections */}
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
