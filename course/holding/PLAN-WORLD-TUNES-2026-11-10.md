# Plan: full records for Africa, Latin America, the Middle East, Eastern Europe and China

Written 2026-11-10, after five research passes, one per region. Every source
below is a public-domain scan that was opened and seen to hold the notation
(spot-checked again for Curtis pp. 103 and 135, Rouanet p. 2824, Luce p. 3
and Stoin p. 98). This plan, and the records it leads to, live on the
workshop branch only; the engine work in part C goes to main, one change at
a time, because it holds no tunes.

## A. What a full record is

The records written so far carry the melody, the words, the source and a
dossier. A full record adds four things, each in the file so the editor and
the board can show it.

| Part | Where it goes in the record | Status of the format |
|---|---|---|
| Melody | the ABC, read from the scan with the notehead reader and the labelled-guide crops; every bar checked against the metre; `N:HOW READ` and `N:UNCERTAIN` | in use |
| Accompaniment | `%%style` and `%%band` lines (drums, bass, chords, control lines) written from the source's own rhythm where it prints one (Rouanet, Curtis's clap parts, d'Harcourt's bombo); `% dossier-accompaniment:` saying what the tradition uses, who plays it, the source for that claim, and what the band substitutes | **new key** |
| Lyrics | `w:` lines in the original language (and a singing translation where the source has one); `% dossier-lyrics:` with the verdict: which verses are sung in class, which are left out and why, and who checked the language | **new key** |
| Cultural notes | `N:` lines for the source's own account (function, who sings, when); `% dossier-respect:` for anything sacred, sensitive or framed badly in the source | in use |
| Performances | `% performance-url: <url> <who, when, and what it shows>`; or `% performance-note:` saying where one might be found (an archive and its shelf mark) when no link exists | **new keys** |

Build work for the format (workshop branch, small): add `accompaniment`
and `lyrics` to `DOSSIER` in `course/holding/build.js` (unknown keys are
dropped today); read `performance-url` and `performance-note` like
`source-url` and show them in the editor's Source panel and on the board
cards as "Listen ↗"; extend the README. The review queue's builder gets the
same keys.

Rules every record keeps:

- **Our additions are named as ours.** A drum under a song the source sings
  unaccompanied is marked in `dossier-honesty`, and the record says how to
  turn it off (the band resting is often the authentic choice).
- **Verses are chosen, not censored silently.** `dossier-lyrics` lists what
  is left out and why.
- **Commentary stays out.** Curtis, Junod, Barrow and d'Harcourt frame their
  informants in colonial or racial terms; records quote their game and song
  notes, never that framing, and say so in `dossier-respect`.
- **Informants are named** (Kamba Simango, Madikane Cele, Konstantinidis…).
- **A speaker of the language checks every record** before it can pass the
  classroom check (`dossier-review` names who is needed).

## B. The candidates, by region

Ranked within each region. "Band now" means the page's current sounds;
"needs" points into part C.

### Africa (sources: Curtis 1920, PD US and Canada, d. 1921; Junod 1897 and 1913, d. 1934)

1. **Mafuve, dance of girls** (Ndau, Mozambique). Curtis p. 103, text pp.
   29-30. A homesick bride's song, vocables mostly; girls dance in pairs
   while the circle claps. Curtis prints **four hand-clap parts** under the
   voice (triplets, sextuplets, a variant in a footnote) and says "no drums
   are used". Band now: stamps on kick, the four clap layers on clap, rim,
   claves and hats: the best layered-rhythm lesson found so far. Melody
   medium-hard (ornamented sixteenths). Performances: none found for the song;
   performance-note: Curtis made phonograph records (p. xxv), location unknown;
   ILAM holds Ndau recordings for style.
2. **Igama la Bantwana, Zulu lullaby "O tu'la, mntwa'na"**. Curtis p. 135,
   text pp. 66-68, from Madikane Cele. 6/8, about 14 bars, E4-E5; footnotes
   mark two "cooing" downward glides and a note between D sharp and E (a
   `%%tuning` or a glide mark). Unaccompanied by tradition (sung with the baby
   on the singer's back); band rests. Zulu spelling is old; a Zulu speaker
   modernises it ("Thula mntwana"). Performance: none for this melody.
3. **How the Animals Dug Their Well, two story songs** (Ndau). Curtis p. 122
   (music), p. 123 (English), pp. 45-47 (the tale). A sung story: each animal
   trots in singing, then a spoken triplet chant ("kupu-tu, kupu-tu, the dust
   is flying!"); the Hare's escape song is in changing metre (2/8 + 10/8 +
   3/8) with a printed clap line used "only for dancing". Band: clap line on
   clap; none when told as a story. Good for a story lesson.
4. **Gwey-ma na-o, "See the oxen!"** (Ronga, southern Mozambique). Junod
   1897 p. 35 and 1913 vol. 2 p. 262 (Tune 30). Four bars, a fourth; children
   running beside a wagon. A first song for the youngest; no accompaniment.
5. **Kanye, kanye, madoda, labouring song** (Zulu words, Ndau workers).
   Curtis p. 108. Leader's call, men's answer "Hai-wet'!" on the heave. Band:
   kick or low woodblock on the heave only, named as ours.

Avoid: Curtis's rain ceremony and Manchiki spirit songs; Junod's exorcism and
war tunes (Tunes 24-29, 32); the owl song (witchcraft associations, tobacco).

### Latin America and the Caribbean

1. **Na Bahia tem** (Brazil, Rio/Bahia/Minas). Alexina de Magalhães Pinto,
   *Cantigas das creanças e do povo* (1916; d. 1921), p. 15 (tune) and pp.
   109-112 (dance with "modo de dançar"): two facing lines, three steps
   forward clapping on each step, three back, then pairs dance a polka. Eight
   bars, a fifth: very easy. Band now: claps marked "+" in the score, the
   Samba de roda style, nylon guitar for the viola, tambourine for the
   pandeiro; needs pandeiro and a scraped plate. Respect: the same words are an
   Umbanda ponto for the Baiano and Erê spirits; present the children's roda
   and say so. Use the 1916 scan, not the 2023 Senate re-engraving.
   Performance: the 2023 edition's WAV (licence unstated, listen only).
2. **Aguinaldo "Si me dan pasteles"** (Puerto Rico). Allena Luce, *Canciones
   populares* (1921), p. 3 (checked): G minor, 2/4, the sung verse printed in
   **parallel thirds**, as jíbaro singers sing it, with an instrumental
   ritornello. Christmas house-visiting (parranda); words about asking for hot
   pasteles: excellent. Accompaniment (Folkways FW 8802 notes): cuatro, tres,
   güiro, maracas, claves, bongó. Band now: claves, shaker, nylon guitar for
   the cuatro, bass; needs güiro, cuatro, bongó. Performances: Library of
   Congress, Aurora Calderón, Oakland, 1939, recorded by Sidney Robertson
   Cowell (item 2017700903); Los Borincanos; Los Aguadillanos. Luce's death
   year is unknown, so the record takes only the traditional tune and its
   thirds, not her piano part; Canadian status to be checked.
3. **Tuyallay, the girls' song to the tuya bird** (Quechua, Cuzco). d'Harcourt
   in Lavignac I/5 (1922), Ex. 24, pp. 3361-3362; accompaniment p. 3368: kena
   and antara in unison or octaves, harp on two chords a third apart, bombo
   "x . x x" in 2/4. Both d'Harcourts died before 1972 (PD in Canada; still in
   copyright in France until about 2042, so the record says so). Range B3-G5:
   transpose, or leave the "Tu-ya-l'ay" cry to the teacher. Use d'Harcourt's
   stanza only: Markham's *Ollantay* translation continues into trapping and
   nailing the bird. Needs quena, panpipes, harp, bombo. Moderate-hard.
4. **Quisiera ser danzantito** (Cuenca, Ecuador). Same volume, Ex. 22, p.
   3360. "I wish I were a little dancer, with bells on my feet... dundu čil,
   čil čil": the čil-čil is the dancers' ankle bells. One player on pipe and
   drum (pinkullu and tinya). Band now: recorder, low woodblock; needs sleigh
   bells. Respect: danzantes belong to Corpus Christi festivals; the song is a
   wish, not a ritual text.
5. Fallback: Hague No. 57, *La Guajira* (Cuba), verse 1 only.

Gaps: no Afro-Caribbean notated source before 1931 was found (bomba, plena,
son, rumba); no Mexico or Central America beyond Hague (*Mexican Folkways*
1925-30 is unmined). Luce's *Arroz con leche* (p. 132) and Alexina's *O
limão*, *A borboleta*, *Sapo jururu* are next in line.

### Middle East and North Africa

1. **Rāna jīnāk and B'qāw ʿala khēr, the Maghreb's opening and closing songs**
   (Algiers). Rouanet in Lavignac I/5 (1920 copyright; Rouanet d. 1944), p.
   2824, checked: both tunes with incipit words and a printed "rythme
   d'accompagnement" each (2/4 high-and-low strokes; 6/8 alternating). Rana
   jinak opens every festivity; B'qaw closes it, and its singers improvise
   couplets naming the guests, so **a class version names the children**: a
   hello song and a goodbye song. Instruments: ghaita, tbal and naqqarat
   outdoors (p. 2823); the women's ensemble with kamanja, tar and derbouka
   indoors (p. 2838). Band now: low stroke on kick, high on rim, tar on
   tambourine; needs ghaita (GM shanai), derbouka, naqqarat. Tuning: 12-tone
   is right here (Rouanet p. 2913: Maghreb modes need no special signs).
   Only the incipits are printed: the couplets are to be written with an
   Arabic-speaking teacher. Performances: none found; performance-note: AMAR,
   and the Yafil 78s on Gallica.
2. **Peasant melody from Adana** (Turkey). Yekta Bey in Lavignac I/5 (Yekta
   d. 1935), p. 2951. Eight bars, no words; the page gives the tetrachord as
   ratios (A, B 20 cents low, C, D), and sets it beside a true A-minor tune:
   **the lesson that hears a neutral second**, with a `%%tuning` line built
   from Yekta's own numbers. Usul: Sofyan, "düm - tek ka" (p. 3028). Needs
   bağlama.
3. **Gutʻanerg, Armenian plough song** ("Pull, pull, O ox! Ara ho!"). Komitas,
   *La lyre arménienne* (1906; Komitas d. 1935, Tchobanian d. 1954), No. 7,
   pp. 28-30, IMSLP #220574. The melody is the top line of Komitas's choral
   setting; his preface says peasants sing unaccompanied in unison, so the
   band rests (a drone at most). Slow and free; the "Ara ho" refrain is for
   the class. Performance: Komitas himself sings No. 1 of the same book on
   archive.org (shah-mouradian); a plough-song 78 by Hagop Asadourian to check.
4. Weak: the Kabyle grinding song from Salvador-Daniel (orientalist French
   words, harmony Rouanet condemns): melody only, if at all.

Rejected: Lane's songs (love and wine songs; the call to prayer is sacred);
Idelsohn's Yemenite volume (synagogue and paraliturgical). Gaps: no Egyptian,
Levantine or Iraqi children's song in Rast or Bayati before 1931; Lavignac's
Persian tasnifs (pp. 3079-3081) and Komitas's *Andzrew ekaw* (the rain falls)
are next.

### Eastern Europe and the Balkans

1. **Zdravets, "Geranium"** (Bulgaria). Vasil Stoin, *Narodna pesnopoyka*
   (1930, PD in the US since 2026-01-01; Stoin d. 1938), No. 102, p. 98,
   checked: "sung at the horo", fast, **9/16 = 2+2+2+3**, six bars, with eight
   lines of words (the geranium picked on St George's Day and woven into
   wreaths). Horo singing was two groups of women answering each other before
   any instruments; then gaida, kaval, gadulka, tapan. Band now: tapan on kick
   and rim in "DUM . tek . tek . tek . ."; needs gaida drone, kaval, gadulka.
   Stoin's pp. 243-245 teach counting odd metres with syllables: worth using
   in the rhythm lab. Respect: the garlanded lamb is the St George's feast
   sacrifice; optional context for teachers.
2. **Bújj, bújj, zöld ág** (Hungary). Kiss Áron, *Magyar gyermekjáték-
   gyűjtemény* (1891; d. 1908), p. 207, Nos. 3 and 4 (MEK PDF p. 235). An arch
   game: two children make a gate, the line passes under; No. 3 is nine bars
   within a fifth, No. 4 adds the gatekeeper dialogue. Unaccompanied; claves on
   the walking beat at most. Performances: the Institute for Musicology's
   archive (zti.hungaricana.hu) lists field recordings, e.g. Szebény 1965.
3. **Vo pole beryoza stoyala** (Russia). Lvov-Prach (1790; 2nd ed. 1806),
   Part I, No. 6, archive.org pisni1806 n138: take the top vocal line, 2/4, A
   minor, 11 bars. A girls' khorovod; stanzas 1-7 (three pipes and a balalaika
   made from the birch) only: the later ones mock an old husband. Band now:
   boom-chick on bass and nylon guitar strummed as a balalaika, tambourine;
   needs balalaika tremolo, garmon. Respect: Semik and Trinity birch rites.
4. **Giánni, mor' Giánni** (Asia Minor Greeks, Nicomedia). Pachtikos (1905;
   d. 1916), No. 112. Four bars, an arch game; pairs with No. 2. Pachtikos's
   reading of the game as the Turkish conquest is folklore, not history: the
   record says so.

Gaps: no Romani song yet (Kuhač has an openly anti-Romani text; a Romani
source from a tradition-bearer is needed); no Romanian children's tune
(Bartók's Bihor collection, 1913, is behind IMSLP's bot check; download it
by hand); Kolberg (Polish), Lysenko (Ukrainian) and more of Stoin's aksak
horos are unmined.

### China

1. **Xianhua diao / Mo li hua, "Fresh Flower" / "Jasmine Flower"** (Jiangsu).
   Two public-domain variants, both read: van Aalst (1884; d. 1914), p. 19,
   **staff and gongche side by side, agreeing note for note** (his gamut table
   on p. 16: 合 C, 四 D, 乙 E, 上 F, 尺 G, 工 A, 凡 B, 六 c, 五 d); and Barrow
   (1804; Hüttner's plain transcription, d. 1847), p. 316, with two stanzas and
   a word-by-word translation. Van Aalst writes B where Barrow climbs to high
   do: a real variant, to show side by side. Range C4-D5 (van Aalst): easy.
   Accompaniment, sourced: Barrow p. 315 (unison, sometimes an octave, never
   parts); van Aalst p. 36 (two pipa, sanxian, fiddles, a small drum, flute,
   yangqin, all in unison). So **heterophony, no chords, no drone**: the band
   needs a mode that plays the tune itself, ornamented, on several sounds (part
   C). Not the 1957 He Fang version, which is in copyright. Performances: Zhang
   Ye's broadcast (the 1957 version, for contrast); Harvard's *Sounding China*
   pages on the Barrow and Hüttner tune.
2. **Ba ban, "Eight Beats"** (all China). Mary Richard, *Paper on Chinese
   Music* (1899; d. 1903), Appendix D No. 20, p. 33: "known all over China... by
   more people than any other single tune". About 47 bars, no words: a playing
   and listening piece in sections, and the mother tune of the Jiangnan sizhu
   *Liu ban* family. Performance: Zhongguo Guoyuetuan, *Lao liu ban*.
3. Accompaniment model only: **Xiao fang niu, "The Little Cowherd"**, in
   Soulié de Morant (1926), pp. 126-131: voice, dizi and danpi drum with gong,
   transcribed from a Pathé-Chine record, and his list of the band (dizi,
   suona, sanxian, yueqin, danpi, luo, cymbals, clappers). The words (bound
   feet) are not for class; the drum and gong parts show how the percussion
   sits under a xiaodiao.

Avoid: Richard's Appendix D Nos. 1-17 (Confucian ritual); van Aalst's other
songs (a girl wanting to marry; a girl sold). Gaps: no notation before 1931
for China's minority peoples; Meng Jiang Nü exists only as Laufer's 1901
cylinder; school songbooks are unmined.

## C. Engine work (main, not the workshop)

The samples are FluidR3 General MIDI (MIT, `vendor/soundfont/`). Most
missing sounds are in that same set, so they come at the same level and
licence; a few are not in General MIDI at all.

| Need | From FluidR3 GM (program or drum note) | Not in GM: needs CC0 samples |
|---|---|---|
| Latin percussion | congas 62-64, bongos 60-61, güiro 73-74, maracas 70, agogô 67-68, triangle 80-81 | pandeiro, prato-e-faca |
| African percussion | (low conga as a stand-in) | djembe, talking drum, gankogui bell |
| Middle Eastern | shanai 111 (ghaita, zurna, suona), sitar 104, taiko 116 for tbal | darbuka dum and tek, riq, naqqarat |
| Balkan and East European | bagpipe 109 (gaida), accordion 21 (garmon, bayan), violin 40 and fiddle 110 (gadulka), banjo 105 for tambura | kaval |
| Andean | pan flute 75 (antara), flute 73 or shakuhachi 77 (kena), harp 46 | bombo legüero |
| Chinese | Chinese cymbal (drum 52) for bo; koto 107 for guzheng; shamisen 106 for sanxian; pizzicato 45 for pipa | erhu, dizi, pipa, luo gong |

Then, in order:

1. **Load more programs** in the Sampler (one folder per program, as today),
   and a `%%band sound:` line so a record names its own instruments.
2. **Kit words** for the new drum notes in `KIT` (cg, cgl, bg, gu, mr, ag,
   tri, cy...) and in the mini-notation's word list.
3. **A heterophony part**: `%%band melody2:` playing the tune itself on a
   second sound, with simple ornament rules (passing notes, octave doubling,
   rests on long notes). The Chinese records need this; so do the Andean
   unison kena and antara, and the Balkan two-group horo.
4. **Styles** (scoreFor) that write these grooves when a tune names them:
   `maghreb` (Rouanet's two printed rhythms), `horo` (aksak from the metre's
   grouping, 2+2+2+3 and 2+2+3), `jibaro` (aguinaldo: cuatro, güiro, maracas,
   bongó), `andean` (bombo and harp), `sizhu` (heterophony, ban on the
   downbeat), and `clap` (layered clap parts, for the Ndau and Brazilian
   songs).
5. **Tuning**: Yekta's Uşşak tetrachord as a ready `%%tuning` line; a glide
   mark for Curtis's cooing slides.

Each step is measured before and after with `test/band-report.js`, and its
README paragraph is updated, as the project already does.

## D. Order of work

1. Format (part A's build work) on the workshop branch: half a session.
2. **Wave 1, one strong record per region**, using only the sounds the band
   has now, each built to the full-record standard: Mafuve (Africa), Na Bahia
   tem (Brazil), Rāna jīnāk with B'qāw (Maghreb), Zdravets (Bulgaria),
   Xianhua diao in both variants (China). Then the classroom-friendly
   second choices: the Zulu lullaby, Si me dan pasteles, Bújj bújj zöld ág,
   the Adana neutral-second lesson, Ba ban.
3. Engine steps C1-C3 on main (sounds, kit words, heterophony), then return
   to the wave-1 records and swap their stand-ins for the real instruments.
4. Wave 2: the rest of part B, and C4-C5 as the records ask for them.
5. Throughout: a speaker of each language reviews words and stresses before
   a record passes its classroom check; performance links are listened to by
   a person before they are trusted, and the record says who listened.

## E. Open questions for the teacher

- Who can review Chindau and Zulu, Portuguese, Spanish, Quechua, Arabic,
  Armenian, Turkish, Bulgarian, Hungarian, Russian, Greek and Chinese words?
  Colleagues, families at the school, or consultants?
- Is a song with sacred use elsewhere (Na Bahia tem as an Umbanda ponto) fine
  in its children's form, with a note?
- For gaps with no public-domain notation (Ghana, Afro-Caribbean rhythms,
  Levantine children's songs, Romani songs): would you accept a CC0
  transcription made with a tradition-bearer, credited by name?
