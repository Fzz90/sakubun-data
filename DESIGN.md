# スマホで一番よく使う機能 (Tema Matematika · 数学)

## Brief
Five-slide interactive HTML presentation in full Japanese (`lang="ja"`) for **A組** (**Mesya Dinda M. 125241022**, **Natasya Ayu W. 125241030**, **Fayza Maharani S. 125241039**, **Faiz Syihab 125241046**). Presents the 6-student smartphone usage survey (`スマホで一番よく使う機能`, respondents: Raya, Arkana, Raphael, Naila, Nabila, Ara) incorporating all sensei corrections from the handwritten sakubun, the 4 survey questions from `147081.jpg`, toggleable `<ruby><rt>` furigana, and a live clockwise-animated interactive SVG pie chart (`円グラフ`).

## Physical Scene & Design Read
- **Scene:** A university Japanese composition (`作文`) group presenting quantitative survey results on a bright classroom projector screen, rendered like a Japanese mathematics classroom chalkboard (`黒板`) paired with ivory drafting paper (`方眼ノート`).
- **Design Read:** Reading this as an interactive academic survey presentation deck for university Japanese-studies classmates and sensei, in a Japanese Mathematics Chalkboard & Drafting Sheet editorial style following `kanji-ka`'s ink-framed 16:9 stage discipline, dial **ENERGY 2 / RHYTHM 3 / MOTION 2**.

## Visual System (Mathematics: Chalkboard Pine, Drafting Ivory, Compass Brass & Proof Vermilion)
Palette cap: 2 core colors (Chalkboard Pine, Proof Vermilion) + 1 accent (Compass Brass) on warm tinted neutrals. Every pairing verified via `contrast-check.py` against WCAG AA (all >= 5.68:1).

- **Graphite Ink (`--ink`)**: `#16211C` (3px frames & primary dark text; `15.47:1` on paper, `16.29:1` on surface)
- **Slate Muted (`--muted`)**: `#46564E` (`7.27:1` on paper, `7.65:1` on surface)
- **Drafting Ivory (`--paper` / `--paper-soft` / `--paper-deep` / `--surface`)**: `#FAF7F0` / `#F2EDE1` / `#E5DEC9` / `#FFFDF8`
- **Chalkboard Pine (`--board` / `--board-deep` / `--board-soft`)**: `#163A2E` / `#0F2A21` / `#DCECE5` (`13.89:1` chalk white `#F7F4EA` on `--board-deep`, `11.14:1` mist `#CFE0D8` on `--board-deep`)
- **Compass Brass (`--brass` / `--brass-hover` / `--brass-ink` / `--brass-soft` / `--brass-amber`)**: `#F2B830` / `#DFA218` / `#5E3A00` / `#FFF4D4` / `#855300` (`9.20:1` ink on `--brass`, `8.50:1` `--brass` on `--board-deep`, `6.07:1` `--brass-amber` on `--paper`)
- **Proof Vermilion (`--proof` / `--proof-ink` / `--proof-soft`)**: `#B5331C` / `#8A2110` / `#FDECE7` (`5.68:1` on `--paper`, `5.98:1` chalk white on `--proof`, `7.95:1` `--proof-ink` on `--proof-soft`)
- **Typography**: `Zen Kaku Gothic New` (`500;700;900` for Japanese headings, body, and furigana) paired with `Cambria Math` (with `STIX Two Text` fallback for non-Windows devices) for all numerals and mathematical notation (`n = 6`, `x̄ = 7.5h`, `66.6%`, `360°`, `Q.E.D.`).

## Slide Architecture (5 Slides)
1. **表紙 (`Cover`)**: Asymmetric 55/45 split pairing display title, `n = 6` summary, A組 4-member roster, and 3-plate mathematical SVG drafting art (protractor `360°` ratio circle, daily hours bar plot `x̄ = 7.5h`, and `n = 6` brass seal).
2. **調査概要 (`Survey`)**: Dual contrasting panels pairing Sakubun P1 purpose/method + real quantitative stats (`n = 6`, `x̄ = 7.5h`, `100%` off-campus) with the 4 survey questions (`Q1–Q4`, emphasizing `Q2`).
3. **円グラフ (`Pie Chart`)**: Clockwise-animated interactive SVG pie chart (`SNS 66.6% / 240°`, `ゲーム 16.7% / 60°`, `日本語辞典 16.7% / 60°`) with protractor degree ring, replay control, and clickable/keyboard-focusable wedges synced with a live respondent inspector.
4. **データ・考察 (`Data & Analysis`)**: 6-respondent matrix (`Raya, Arkana, Raphael, Naila, Nabila, Ara`) paired with the chalkboard `4/6 + 1/6 = 5/6 = 83.3%` analysis panel from Sakubun P3.
5. **結論 (`Conclusion`)**: Full-bleed Chalkboard Pine closing plate quoting the corrected Sakubun conclusion, geometric `Q.E.D.` compass proof emblem, group credits, and return-to-start action.
