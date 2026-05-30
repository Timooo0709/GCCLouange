# Guide de Relecture et Correction des Partitions (ChordPro) — GCC Louange

Ce document synthétise toutes les règles, habitudes et préférences de formatage apprises à travers les corrections manuelles effectuées sur les chants bilingues (chinois/français). Ces règles doivent être appliquées de manière systématique pour toute nouvelle relecture ou correction autonome de fichier `.cho`.

---

## 1. Usage des Pronoms
* **Règle :** Nous n'utilisons plus les pronoms honorifiques divins `祢` (ou `祢的`) et `祂`. Tous les chants doivent utiliser systématiquement les pronoms standard **`你`** (et **`你的`**) ainsi que **`他`** (et **`他的`**), y compris pour s'adresser à Dieu, Jésus ou le Saint-Esprit.
* *Exemple :*
  * Avant : `祢是我的[D]主` ➔ Corrigé : `你是我的[D]主`


---

## 2. Métrique et Alignement Rythmique des Accords

### A. Calage sur les Résolutions (Syllabes de fin)
Les accords ne doivent pas être calés de manière rigide au début de chaque mot composé. Ils doivent être placés précisément sur la syllabe chantée qui reçoit la pulsation ou la syncope de résolution :
* **Sur la syllabe finale d'un adjectif ou verbe :**
  * `温柔又慈[A7]祥` (accord placé sur 祥 et non 慈)
  * `向着我照[A7]亮` (accord placé sur 亮 et non 照)
  * `完全地摆[A7]上` (accord placé sur 上 et non 摆)
  * `我愿意降[Bm7]服` (accord placé sur 服 et non 降)
* **Sur la particule ou le pronom :**
  * `你[C#m7]的爱` (sur de)
  * `使[F#m7]我` (sur wǒ)
  * `不[F#m7]是` (sur shì)
  * `居住在[Asus4]你爱里` (sur 你)

### B. Calage Rythmique (Pulsation vs Entrée Vocale)
Le placement des accords par rapport aux caractères traduit précisément le rythme du chant et les mesures musicales :
* **Usage de l'espace après le crochet (Respect des mesures et du rythme) :** On laisse un espace après le crochet de l'accord (`[Accord] `) pour marquer la structure de la mesure (ex: l'accord tombe sur le temps fort), alors que la voix n'attaque la syllabe que légèrement après (syncope, décalage rythmique ou contre-temps).
  * Exemples : `喔主，[C] 你赐我`, `[Am7] 得着完全`, `[Am] 在你`, `[C7] 在你`, `！[G/F] 喔`.
* **Collage direct (Attaque synchrone) :** L'accord est collé directement au caractère qui suit si la pulsation de l'accord et l'attaque de la syllabe chantée sont parfaitement simultanées.
  * Exemples : `主，[Dm7]你大能`, `你[C#m7]的爱`.

### C. Accords de Passage en Fin de Ligne
Les accords de transition finale ou de passage qui terminent un vers doivent se placer **après** la ponctuation finale du texte :
* `哈利路亚。[A/B]` (et non `哈利路亚[A/B]。`)

### D. Placement des Accords d'Anacrouse et de Transition
* **Placer les accords d'anacrouse (upbeats) au début de la strophe suivante :** Les accords de transition joués juste avant l'attaque vocale d'une nouvelle strophe (ex: transition du Pré-Refrain au Refrain) doivent être placés **au début** de la ligne de cette nouvelle section plutôt qu'à la fin de la section précédente.
  * *Exemple :* `[Bb/C]  [C7]我要[F]一生...` (placés au début du Refrain).
* **Espacement des accords d'introduction successifs :** Si plusieurs accords d'introduction se succèdent sans texte au début d'une ligne, les séparer par deux espaces :
  * *Exemple :* `[Bb/C]  [C7]我要`
* **Identification des syllabes anacrusses dans le Jianpu :** Une syllabe dont la note dans le jianpu correspond au motif `0 [n]` (repos suivi d'une note courte en fin de mesure) est une **anacrouse** — elle reste sous l'accord précédent. L'accord suivant se place **après** cette syllabe, sur la première note forte de la mesure suivante. Ne jamais placer l'accord AVANT une syllabe anacrusse.
  * *Exemples issus de 不停赞美 (clé D) :*
    * Section D se terminant par `5 - - 0 5` → syllabe `是` = anacrouse sous D → **`[D]敬拜耶稣，是[G]我的生命`** (et non `[D]敬拜耶稣，[G]是我的生命`)
    * Section A se terminant par `3̄2̄ 2̄2̄0 1` → syllabe `在` = anacrouse sous A → **`在[G]春夏秋冬的`** (et non `[G]在春夏秋冬的`)
    * Section G se terminant par `6 6 6 5̄3̄` → dernière syllabe `每` = dernier temps de G → **`在[G]每个白天，每[A]个黑夜`** (et non `[G]在每个白天，[A]每个黑夜`)

### E. Simplification Harmonique
Éviter la surcharge d'accords de passage ou de quart de mesure complexes s'ils alourdissent la lecture ou nuisent à l'interprétation. Simplifier et stabiliser les cadences finales :
* *Exemple :* Préférer la transition directe `[Em7]你是我，[Em7/A]你是我的主[D]。` plutôt que d'intercaler des accords de basse intermédiaires encombrants.

### F. Respect de l'Intégrité des Phrases et Mots (Découpage des Lignes)
Lors du découpage en lignes de chant, la lisibilité et l'intégrité grammaticale des paroles doivent toujours primer sur l'alignement rigide avec les barres de mesure musicales.
* **Ne pas couper les mots composés ou les expressions courtes** à cheval sur deux lignes (comme `我的心`, `一生爱你` ou `一生奉献`), même si musicalement les premières syllabes (l'anacrouse/upbeat) commencent sur les derniers temps de la mesure précédente.
* **Placer l'anacrouse au début de la ligne suivante** avec les paroles associées, et y caler l'accord d'upbeat correspondant juste devant la première syllabe du mot.
* *Exemple (Chant 一生爱你) :*
  * **Incorrect (coupe les expressions sémantiques) :**
    `亲[E]爱的宝贵[A]耶稣，你[F#m]爱何等的[Bsus4]甘[B]甜，我的` (finit par "我的")
    `我的[G#m]心深深被你[C#m]吸引，爱[F#m]你是[B]我的喜[E]乐。[A/B] 一生爱` (finit par "一生爱")
    `[E]你，[G#]一生敬拜[C#m]你...` (refrain commence au milieu d'une expression par "你")
  * **Correct (mots et expressions préservés) :**
    `亲[E]爱的宝贵[A]耶稣，你[F#m]爱何等的[Bsus4]甘甜[B]，` (phrase 1 complète)
    `我的[G#m]心深深被你[C#m]吸引，爱[F#m]你是[B]我的喜[E]乐。` (phrase 2 complète)
    `[A/B] 一生爱[E]你，[G#]一生敬拜[C#m]你...` (refrain commence par l'expression complète "一生爱你", avec l'accord d'anacrouse `[A/B]` placé en début de ligne devant "一生爱")

### G. Étude de cas pratique : Alignement rythmique (Chant *一颗谦卑的心*)

Pour illustrer l'alignement rythmique rigoureux à partir de la structure d'une mesure (temps forts 1 et 3 en 4/4), voici comment les accords doivent être calés par rapport aux pulsations, qu'il y ait une attaque vocale synchrone ou un décalage (syncope/tenue) :

1. **Alignement rythmique sur les temps de la mesure (Couplets)** :
   * **Pulsation sur le mot `我` (Couplet, mesure 3)** : Le premier temps de la mesure tombe sur la syllabe `我` (note `1 .`). L'accord de `[G]` doit être placé juste avant `我` (`给[G]我`).
   * **Placement de `[D/F#]` sur le 3ème temps (`个`)** : Le 3ème temps de cette mesure tombe sur le caractère `个` (note `2`). L'accord de `[D/F#]` doit se caler sur `个` (`一[D/F#]个`) et non sur `一` ou `受`.
   * **Résolutions de fin de phrase** :
     * `[Em]` tombe sur le premier temps de la mesure suivante qui est la syllabe `教` (note `5 .`), d'où `受[Em]教`.
     * `[A7]` tombe sur le 3ème temps qui est la syllabe `灵` (note `5`), d'où `的[A7]灵`.
     * Dans le couplet 2, la tension de l'accord diminué `[A7b9]` résout précisément sur `稣` (3ème temps, note `1`), d'où `耶[A7b9]稣的生[D]命` (avec le `[D]` final sur `命` qui redémarre la mesure suivante).

2. **Le silence vocal et la pulsation instrumentale (Refrain)** :
   * **Usage des espaces après les crochets (`[A/C#] ` et `[D/F#] `)** : Sur le refrain, la syllabe `我` est tenue pendant 3 temps. L'instrument change d'accord sur le 3ème temps (pulsation forte), alors que la voix ne reprend qu'au contre-temps du 4ème temps pour chanter `更多` / `更深`.
   * Placer l'accord directement contre le mot (ex: `[A/C#]更多`) est incorrect car la voix ne chante pas à ce moment-là.
   * Il faut écrire `[A/C#] 更多` (avec un espace après l'accord) pour indiquer que l'accord est joué sur le 3ème temps de la mesure instrumentale, puis la voix attaque après.

3. **La synchronisation syllabique directe** :
   * **Résolution sur `靠`** : L'accord de transition dominante `[A7]` tombe exactement sur le 3ème temps de la mesure, qui correspond à la syllabe `靠` dans `倚靠` (note `2`). Le placement correct est donc bien `倚[A7]靠` (et non `靠，[A7]`).

### H. Étude de cas pratique : Accords de transition et de fin de phrase (Chant *不停赞美你*)

Pour calibrer correctement les accords de transition et les résolutions sans briser la lecture sémantique et visuelle du chant :

1. **Intégrité sémantique et accords de transition en fin de sous-phrase** :
   * Les mots ou expressions unies (comme `时时称颂你` ou `向你来歌唱`) ne doivent pas être coupés par des accords de transition de fin de mesure (ex: `[D/C]` ou `[Em]`).
   * Si l'accord tombe sur une note tenue ou un silence à la fin de la sous-phrase, il se place **après** le mot et sa ponctuation (ex: `时时称颂你，[D/C]` et `向你来歌唱，[Em]`). Cela évite de hacher le texte.
   * **Enchaînement d'accords hors chant** : Si un accord de transition résout en fin de phrase puis qu'un autre accord lance la mesure suivante sur une syllabe d'anacrouse, on les place à la suite à la fin de la phrase (ex: `时时称颂你，[D/C] [Bm7]向...`).

2. **Accords de résolution finale** :
   * L'accord de résolution finale d'un vers (comme le `[G]` final) se positionne à la toute fin de la ligne, après la ponctuation (ex: `伟大的神。[G]`), et non au milieu de l'expression (`伟大[G]的神`).

3. **Précision des espaces après crochets (Silences et pulsations)** :
   * **Avec espace (`[Accord] Syllabe`)** : Si l'accord est joué sur un temps fort instrumental (pulsation, début de mesure) mais que la voix ne commence/reprend à chanter qu'après un silence ou un contretemps (ex: sur le 2ème temps), on laisse un espace après le crochet.
     * *Exemples :* `[Emaj7] 主的喜乐` (la voix commence sur le temps 2), `[(E/G#)] 无论得时` (l'accord change sur le temps 1 de la mesure, la voix chante sur le temps 2).
   * **Sans espace (`[Accord]Syllabe`)** : Si la voix et la pulsation instrumentale attaquent exactement en même temps, l'accord est collé au caractère.
     * *Exemples :* `我仍[F#m]因`, `我心[F#m]坚定`.

### I. Accords optionnels, de passage et d'alternative

Pour enrichir la partition tout en guidant au mieux l'instrumentiste, utiliser le formatage suivant pour les accords spécifiques :
1. **Accords optionnels ou de passage rapide (Basses intermédiaires)** :
   * S'ils sont joués rapidement en transition ou s'ils sont facultatifs pour une version simplifiée, les entourer de parenthèses : `[(A/C#)]`, `[(D/F#)]`, `[(C#m)]`.
   * *Exemples :* `无论是住[(A/C#)]在`, `我仍[F#m]因救我的[(F#/A#)]神`.
2. **Accords d'alternative ou substitution** :
   * Si deux options d'accords sont possibles ou si un accord enrichi remplace un accord simple, écrire l'accord principal suivi de l'alternative entre parenthèses dans le même crochet.
   * *Exemples :* `[G (G#m7b5)]`, `[D/A (D/F#)]`.

### J. Respect absolu de la structure et répétition du chant

* **Pas de raccourcis structurels** : Ne jamais condenser ou omettre des répétitions de couplets ou de refrains présentant des variations harmoniques ou de paroles (ex: changer une phrase ou un accord dans la dernière répétition).
* **Déroulé complet** : Écrire toutes les strophes répétées avec leurs accords exacts plutôt que d'utiliser des annotations de répétition ou des raccourcis comme des "Coda" fictifs si la structure chantée est une suite de refrains complets.
  * *Exemple (丰盛的应许) :* Écrire toutes les variations du refrain à la suite sous `{start_of_chorus: 副歌/Refrain}` pour refléter fidèlement le déroulement de la chanson.

---
## 3. Structure Visuelle et Parallélisme
* **Fidélité stricte à la partition PDF :** La structure du `.cho` doit correspondre exactement aux sections présentes dans la partition PDF de référence. Ne jamais conserver ni inventer une section absente du PDF (refrain supplémentaire, pont, outro). Ne pas numéroter les sections (`副歌1/副歌2`) si la partition n'en montre qu'une seule.
  * *Exemple :* Dans 不停赞美, une section 哈利路亚 absente du PDF → supprimée du `.cho` ; un seul refrain → `{start_of_chorus: 副歌/Refrain}` sans numéro.
* **Vérification de la structure du chant :** Toujours vérifier la structure officielle des paroles et de la musique pour découper le fichier en strophes musicales réelles.
  * *Découpage des Couplets :* Si le couplet contient plusieurs strophes distinctes (ex: Verset 1 et Verset 2), les séparer en `{start_of_verse: 主歌1/Couplet1}` et `{start_of_verse: 主歌2/Couplet2}`.
  * *Découpage des Refrains :* Si le refrain a deux parties ou une suite spécifique, le diviser en `{start_of_chorus: 副歌1/Refrain1}` et `{start_of_chorus: 副歌2/Refrain2}`.
* **Parallélisme des Strophes :** S'assurer que les couplets successifs partagent le même découpage de lignes (line breaks) pour un parallélisme visuel et rythmique parfait.
* **Division des Sections Répétitives :** Si un Refrain ou un Pont se répète avec des variations de fin ou des accords d'anacrouse différents, les scinder en sections distinctes :
  * `{start_of_chorus: 副歌1/Refrain1}`
  * `{start_of_chorus: 副歌2/Refrain2}`
  * `{start_of_bridge: Pont1}`
  * `{start_of_bridge: Pont2}`

---

## 4. Rigueur des Paroles et Synchronisation du Pinyin
* **Vérification du Compte de Syllabes :** Chaque sinogramme de la ligne de chant doit avoir son équivalent exact en pinyin sur la ligne du dessous. Si une syllabe manque, la rajouter en respectant l'espacement visuel (3 espaces entre chaque mot Pinyin).
* **Prononciation Contextuelle :**
  * **降服** (se soumettre) : se prononce **`xiáng fú`** et non `jiàng fú` (ton de la soumission vs ton de la descente).
  * **模样** (apparence) : se prononce **`mú yàng`** et non `mó yàng`.
* **Détection des Coquilles par comparaison Paroles/Pinyin :** Utiliser la ligne de Pinyin comme source de vérité pour corriger les fautes d'inattention dans les sinogrammes.
  * *Exemple :* `此时时刻` (typo dans les paroles) corrigé en `此时此刻` pour correspondre au pinyin exact `cǐ shí cǐ kè`.
* **Tenue de note / Allongement des onomatopées :** Utiliser des tirets longs pour représenter le prolongement d'une note ou d'une voyelle chantée dans les paroles, sans altérer le pinyin court :
  * Paroles : `[B]哦——！` ➔ Pinyin : `ó`
* **Paroles mixtes (Chinois/Anglais ou Français) :** Si une ligne de paroles contient à la fois du chinois et des mots dans une autre langue (comme de l'anglais ou du français), ne pas transcrire ni répéter ces mots étrangers sur la ligne de Pinyin du dessous. La ligne de Pinyin s'arrête au dernier sinogramme chinois.

---

## 5. Références de partition : Jianpu (简谱) et Wuxianpu (五线谱)
Pour corriger et valider les fichiers `.cho` (accords, paroles, tempo, rythmique), nous nous appuyons systématiquement sur les deux types de partitions comme outils de référence et sources de vérité, **en priorité en consultant les fichiers PDF correspondants situés dans le dossier `/Users/timothee/Desktop/Site partitions/Partitions/`** :
* **Le 简谱 (Jianpu - Portée chiffrée) :**
  * Il représente les notes par les chiffres `1` à `7` (et `0` pour les silences).
  * Il est supporté textuellement dans le format ChordPro de ce site via la directive `{jianpu: ...}` placée juste au-dessus de la ligne de chant.
  * Lors de la correction, nous devons l'utiliser pour vérifier les hauteurs de note et l'alignement précis des syllabes si le fichier inclut des directives `{jianpu: ...}`.
* **Le 五线谱 (Wuxianpu - Portée classique occidentale) :**
  * C'est la portée classique à 5 lignes horizontales et 4 interlignes avec des têtes de notes (noires, blanches, etc.) et des clés au début (Clé de sol 𝄞, Clé de fa 𝄢).
  * Il ne peut pas être écrit sous forme de texte brut dans les fichiers `.cho`. Nous l'utilisons visuellement (en ouvrant le PDF du chant dans le dossier `Partitions`) comme source de vérité pour caler correctement les accords sur les pulsations et vérifier le rythme, la structure et les paroles exactes d'un chant.

### Méthode pas-à-pas de correction rythmique à partir du PDF

Pour caler précisément les accords sur les bons caractères d'un fichier `.cho` en utilisant la partition PDF de référence :

1. **Analyser la signature rythmique et les barres de mesure** : repérer les barres de mesure (`|`) sur la partition PDF pour isoler chaque groupe de temps (ex: 4 temps pour une mesure en 4/4).
2. **Repérer les pulsations (temps forts)** : localiser la note qui tombe sur la pulsation de l'accord (généralement le 1er temps, parfois le 3ème temps de la mesure).
3. **Faire correspondre la note et le caractère chanté** : trouver quel caractère (parole sous la note) correspond à cette note de pulsation sur la partition.
4. **Positionner l'accord dans le fichier `.cho`** :
   * Si la pulsation de l'accord et l'attaque du caractère sont simultanées, coller l'accord directement : `你[C#m]的爱`.
   * Si l'accord tombe sur le temps fort (pulsation) mais que le chant ne démarre qu'après (syncope ou contre-temps), insérer un espace après le crochet de l'accord : `[C] 你`.
   * Si l'accord accompagne une anacrouse (upbeat) lançant la phrase suivante, le placer au début de cette ligne cible devant le premier mot (ex: `[A/B] 一生爱[E]你`).

