# Sources

Texts and data the rhythm and dance analyzers read. Everything here is public domain or CC0; the Groove MIDI Dataset (CC BY 4.0) is not copied here because of its size, the CLI reads it from wherever it is unzipped.

| File | What it is | Licence |
|---|---|---|
| `burchenal-1922-folk-dances-from-old-homelands.txt` | Elizabeth Burchenal, *Folk-Dances from Old Homelands* (G. Schirmer, 1922), the Internet Archive's OCR text of the New York Public Library copy: https://archive.org/details/folkdancesfromol00burc. Thirty-three folk dances with music, formation and figures, and a classified index of which suit very small children, larger boys and girls, and adults. | Public domain (published in the US before 1930) |
| `burchenal-1918-american-country-dances.txt` | Elizabeth Burchenal, *American Country-Dances*, volume 1 (G. Schirmer, 1918), the Internet Archive's OCR text: https://archive.org/details/americancountry01burc. Twenty-eight New England contra dances with calls, classified by formation. | Public domain |
| `groovesteps-drum-patterns.json` | GrooveSteps drum patterns, sixteen-step grids for six voices with a difficulty label: https://huggingface.co/datasets/Janady07/groovesteps-drum-patterns | CC0 1.0 |

Typed here, CC0: `../rhythms/traditional.rhythms.txt` and `../dances/steps.dances.txt` (textbook and ballroom-and-folk basics), `../rhythms/world.rhythms.txt` (42 patterns: North Indian talas and Adi tala, a konnakol phrase, Ewe and Ga bell patterns and a djembe accompaniment, Egyptian and Turkish iqa'at, Bulgarian and Greek aksak metres, flamenco compás, son jarocho, cumbia, dembow, candombe, taiko ji, a Korean jangdan, a Javanese gong cycle, the ipu for hula, bodhrán, second line and hambone) and `../dances/world.dances.txt` (24 steps: salsa, merengue, bachata, samba, cumbia, zapateado, kpanlogo, hambone, swing, hip-hop two-step, gumboot, dabke, hora, mayim, pravo horo, hasapiko, kalamatianos, bhangra, garba, hula kaholo and hela, tinikling, Irish sevens and threes, pas de basque). They are typed from how the patterns and steps are taught in schools and community classes, several marked simplified; ceremonial and sacred dances are left out on purpose. Traditional patterns are nobody's copyright; the typing is CC0.

Not here, read in place:

| Corpus | Where | Licence |
|---|---|---|
| Groove MIDI Dataset (Magenta, Google) | https://magenta.tensorflow.org/datasets/groove, the MIDI-only zip (3 MB, 1,150 performances with style, tempo and metre in `info.csv`) | CC BY 4.0 |

Looked at and left out, with the reason:

- *260 Drum Machine Patterns* and *200 Drum Machine Patterns* (René-Pierre Bardet, Hal Leonard) as transcribed in several GitHub repositories: the books are in copyright and the repositories carry no licence.
- The Caller's Box (ibiblio contra dance database, 16,000 dances): figure-level, not footwork, and many dances are CC BY-NC or search-only.
- The Scottish Country Dance Database (strathspey.org): daily SQLite dumps at https://media.strathspey.org/scddata/ under CC BY 3.0 Germany, so the licence is fine, but the cribs are figure-level (reels of three, allemande, poussette) with no footwork, and most of the 20,000 dances are modern devisers' choreography. Worth returning to for a figure vocabulary, not for steps. MiniCrib: licence unread.
- Niols's repository of Scottish country dances (github.com/Niols/scd.niols.fr): YAML dances with bar-by-bar phrases, but no licence file.
- Taminations (square dance call animations, github.com/bradchristie/taminations-flutter): GPL-3.0, so compatible since the project moved to AGPL-3.0. About 500 call files (Mainstream 65, Plus 51, A1 36, A2 26, C1 87, C2 79, C3 150) give each dancer's path as named moves with beat counts and hand holds, graded by the Callerlab programme and a per-animation difficulty 1 to 3. Figure-level, not footwork. Read by `../figure-cli.js` into `../figure-set.json` (Mainstream and Plus by default); the clone is not kept here.
- Labanotation score collections (Dance Notation Bureau, ICKL bibliographies, university special collections): catalogued on paper, for research use, not downloadable as data.
- Academic and archival collections that would need permission rather than a licence: the Global Jukebox (Association for Cultural Equity) publishes Lomax's Cantometrics codings as CC BY 4.0 on GitHub, but the Choreometrics dance codings are not in the release; the Hungarian Institute of Musicology's folk dance archive (Néptánc Tudástár, Fügedi's motif collection in Labanotation, films) publishes online with no stated licence and documentation on request; the Dance Notation Bureau library grants educational use of Labanotation scores on request, with rights held by each choreographer; the Saraga Indian art music datasets (CompMusic, UPF) are CC BY-NC-SA 4.0, so not compatible, though Saraga Audiovisual (2025) is CC BY 4.0.
- Library of Congress, *An American Ballroom Companion* (dance manuals 1490 to 1920): public domain scans and a natural next source for historical social dance; not yet read.

Curriculum references (quoted, not copied): The Ontario Curriculum, Grades 1–8: The Arts (2009) and The Kindergarten Program (2016), Queen's Printer for Ontario; see `../ontario.md`. CODE (code.on.ca) and OMEA (omea.on.ca) materials are members' or personal-use resources under their own terms and are not used.
