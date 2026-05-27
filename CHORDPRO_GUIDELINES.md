# Guide de Relecture et Correction des Partitions (ChordPro) — GCC Louange

Ce document synthétise toutes les règles, habitudes et préférences de formatage apprises à travers les corrections manuelles effectuées sur les chants bilingues (chinois/français). Ces règles doivent être appliquées de manière systématique pour toute nouvelle relecture ou correction autonome de fichier `.cho`.

---

## 1. Respect des Pronoms Divins
* **Règle :** Lorsque les paroles s'adressent directement à Dieu, Jésus ou le Saint-Esprit, privilégier systématiquement le pronom honorifique divin **`祢`** (et **`祢的`**) à la place du pronom humain `你` (et `你的`).
* **Pinyin correspondant :** Le Pinyin reste écrit **`nǐ`** pour `祢` et **`nǐ de`** pour `祢的`.
* *Exemple :*
  * Brut : `你是我的[D]主` ➔ Corrigé : `祢是我的[D]主`

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
  * `祢[C#m7]的爱` (sur de)
  * `使[F#m7]我` (sur wǒ)
  * `不[F#m7]是` (sur shì)
  * `居住在[Asus4]祢爱里` (sur 祢)

### B. Calage en Début de Segment / Anacrouse
Si la mesure ou le segment musical démarre par un accord, placez-le juste devant la première syllabe avec un espace pour marquer le temps fort d'attaque :
* `[Dmaj9] 我知[E]道`
* `[G]在祢爱的`
* `[Em7]我愿意`

### C. Simplification Harmonique
Éviter la surcharge d'accords de passage ou de quart de mesure complexes s'ils alourdissent la lecture ou nuisent à l'interprétation. Simplifier et stabiliser les cadences finales :
* *Exemple :* Préférer la transition directe `[Em7]祢是我，[Em7/A]祢是我的主[D]。` plutôt que d'intercaler des accords de basse intermédiaires encombrants.

---

## 3. Structure Visuelle et Parallélisme
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
