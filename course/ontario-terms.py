#!/usr/bin/env python3
"""Grade-level the Music and Dance glossary terms of The Ontario Curriculum, Grades 1-8: The Arts (2009).

    pdftotext arts18b09curr.pdf arts-flow.txt            (reading order, for the strand sections)
    pdftotext -layout arts18b09curr.pdf arts-layout.txt  (columns kept, for the two-column glossary)
    python3 course/ontario-terms.py arts-flow.txt arts-layout.txt course/ontario-terms.json

For each glossary term, the first grade whose Dance (or Music) strand text uses the term, and whether that first use
is in the grade's Fundamental Concepts box or in its expectations. Writes the JSON the README describes; the
course/ontario-glossary.md tables were written from it. The PDF is at
https://www.edu.gov.on.ca/eng/curriculum/elementary/arts18b09curr.pdf
"""
import re, json, sys
FLOW, LAYOUT, OUT = sys.argv[1:4]
L = open(FLOW).read().split('\n')
NOISE = re.compile(r'^(GLOSSARY|\d+|Dance Illustrations|Drama Illustrations|Music Illustrations|Visual Arts Illustrations|THE ONTARIO CURRICULUM.*)\s*$')

# ---- the strand sections, grade by grade ----
overview = [(i, l[0]) for i, l in enumerate(L) if 3300 < i < 10100 and re.match(r'^[ABCD]1\. Creating and P\w+: apply', l)]
assert len(overview) == 32, len(overview)
STRAND = {'A': 'dance', 'B': 'drama', 'C': 'music', 'D': 'visual'}
sections = []
for k, (i, letter) in enumerate(overview):
    g = k // 4 + 1
    fc = next(j for j in range(i, i + 60) if re.match(rf'^FUNDAMENTAL CONCEPTS FOR GRADE {g}\s*$', L[j]))
    end = overview[k+1][0] if k + 1 < len(overview) else 10100
    spec = next((j for j in range(fc, end) if re.match(rf'^{letter}1\.1\b', L[j])), None)
    if spec is None: print('no spec line', g, letter, fc); spec = min(fc + 40, end)
    sections.append({'grade': g, 'strand': STRAND[letter], 'fc': fc, 'spec': spec, 'overview': i, 'end': end})
def text(a, b):
    t = '\n'.join(l for l in L[a:b] if not NOISE.match(l))
    t = re.sub(r'-\n(?=[a-z])', '', t)          # re-join words hyphenated at a line end
    t = re.sub(r'\s+', ' ', t)
    return t + ' ¶ ' + re.sub(r'\s*\([^)]*\)', '', t)   # and once more with the parenthetical asides removed, so "binary (AB) form" reads as "binary form"
for s in sections:
    s['concepts'] = text(s['fc'], s['spec']); s['expectations'] = text(s['overview'], s['fc']) + ' ' + text(s['spec'], s['end'])

# ---- the glossary entries ----
def entries(lines):
    key = lambda t: re.sub(r'[^a-z0-9 ]', '', t.lower()).strip()
    cands = []   # (line index, term, rest of line)
    for n, l in enumerate(lines):
        if NOISE.match(l) or not l.strip(): continue
        m = re.match(r'^([A-Za-z][A-Za-z0-9 ,’\'/()-]{0,70}?)\. (?=[A-Z(“"\d])', l)
        if m and len(m.group(1).split()) <= 6 and ',' not in m.group(1) and not re.match(r'^(of|and|or|the|is|a|to|in) ', m.group(1), re.I): cands.append((n, m.group(1).strip(), l[m.end():].strip()))
    # glossary terms run alphabetically: keep the longest non-decreasing run of candidates, which drops sentence fragments
    keys = [key(c[1]) for c in cands]; n = len(cands)
    best = [1] * n; prev = [-1] * n
    for i in range(n):
        for j in range(i):
            if keys[j] <= keys[i] and best[j] + 1 > best[i]: best[i] = best[j] + 1; prev[i] = j
    i = max(range(n), key=lambda k: best[k]); keep = []
    while i >= 0: keep.append(i); i = prev[i]
    keep = sorted(keep)
    out = []
    for k, ci in enumerate(keep):
        n0, term, rest = cands[ci]
        n1 = cands[keep[k + 1]][0] if k + 1 < len(keep) else len(lines)
        body = [rest] + [l.strip() for l in lines[n0 + 1:n1] if l.strip() and not NOISE.match(l)]
        d = re.sub(r'\s+', ' ', ' '.join(body)); d = re.sub(r'-\s(?=[a-z])', '', d)
        out.append({'term': term, 'definition': d})
    return out
# The glossary is set in two columns; the layout extraction keeps them side by side, so read each page's left column
# then its right column (the reading order), and partition at the strand headings.
LAY = open(LAYOUT).read()
gstart = LAY.index('The following definitions of terms are intended')
COL = []
for page in LAY[gstart:].split('\f'):
    left, right = [], []
    rows = [l for l in page.split('\n') if l.strip() and not NOISE.match(l.strip())]
    lm = min((len(l) - len(l.lstrip(' ')) for l in rows), default=0)   # the page's left margin: odd pages are indented
    for l in rows:
        m = next((g for g in re.finditer(r'(?<=\S) {4,}(?=\S)', l) if g.end() >= lm + 30), None)
        if l.startswith(' ' * (lm + 40)): right.append(l.strip())
        elif m: cut = m.end(); left.append(l[:cut].strip()); right.append(l[cut:].strip())
        else: left.append(l.strip())
    COL += left + right
heads = {h: next(i for i, c in enumerate(COL) if re.match(rf'^{h}(\s|$)', c)) for h in ['DANCE', 'DRAMA', 'MUSIC', 'VISUAL ARTS']}
dance_terms = entries(COL[heads['DANCE'] + 1:heads['DRAMA']])
music_terms = entries(COL[heads['MUSIC'] + 1:heads['VISUAL ARTS']])

def variants(term):
    base = re.sub(r'\s*\([^)]*\)', '', term).strip()
    vs = [v.strip() for v in base.split('/') if v.strip()]
    return vs or [base]
def find(term, strand):
    for v in variants(term):
        caps = v.isupper()
        pat = re.compile(r'(?<![A-Za-z])' + re.escape(v) + r'(s|es)?(?![A-Za-z])', 0 if caps else re.I)
        for s in sections:
            if s['strand'] != strand: continue
            if pat.search(s['concepts']): return s['grade'], 'concepts', v
            if pat.search(s['expectations']): return s['grade'], 'expectations', v
    return None, None, None
def grade_all(terms, strand):
    out = []
    for e in terms:
        g, where, v = find(e['term'], strand)
        out.append({'term': e['term'], 'grade': g, 'where': where, 'definition': e['definition']})
    return out
res = {'dance': grade_all(dance_terms, 'dance'), 'music': grade_all(music_terms, 'music')}
out = {'source': 'The Ontario Curriculum, Grades 1-8: The Arts (2009), glossary pp. 159-177, graded against the Dance and Music strands',
       'method': 'For each glossary term, the first grade whose strand text (Fundamental Concepts box, then the expectations) uses the term; "where" says which. Terms the strand text never uses are unplaced. Definitions stay in the document.'}
for k in res: out[k] = [{'term': t['term'], 'grade': t['grade'], 'where': t['where']} for t in res[k]]
json.dump(out, open(OUT, 'w'), indent=1, ensure_ascii=False)
for k in res:
    placed = [t for t in res[k] if t['grade']]
    print(k, len(res[k]), 'terms,', len(placed), 'placed;', 'by grade', {g: sum(1 for t in placed if t['grade'] == g) for g in range(1, 9)})
    print('  unplaced:', '; '.join(t['term'] for t in res[k] if not t['grade']))
for k in res:
    for g in range(1, 9):
        print(f"  {k} {g}:", '; '.join(f"{t['term']}{'*' if t['where']=='concepts' else ''}" for t in res[k] if t['grade'] == g))
