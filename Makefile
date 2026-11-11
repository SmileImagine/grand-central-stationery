.PHONY: smoke band-metrics sets reports classroom-fit class-parts dossier-gaps accompaniment-audit coverage-map concepts

# The workshop and the review queue exist only in the workshop branch, never on main (see course/README.md).
sets:
	if [ -f course/holding/build.js ]; then node course/holding/build.js; fi
	if [ -f course/review/build.js ]; then node course/review/build.js; fi
	node course/build-sets.js

# The course reports, rebuilt after the set changes (the smoke test fails while any is stale).
reports: classroom-fit class-parts dossier-gaps accompaniment-audit coverage-map concepts

classroom-fit:
	node course/classroom-fit.js --md course/classroom-fit.md

class-parts:
	node course/class-parts.js --md course/class-parts.md

dossier-gaps:
	node course/dossier-gaps.js --md course/dossier-gaps.md

accompaniment-audit:
	node course/accompaniment-audit.js --md course/accompaniment-audit.md

coverage-map:
	node course/coverage-map.js --md course/coverage-map.md

# One idea from each element of music in each piece, with the bars that show it (the piece view's Listen step reads it).
concepts:
	node course/concepts.js

smoke:
	node test/smoke.js

# The Band measured in headless Chrome (needs Chrome and python3): docs/BAND-METRICS.md, compared with the saved baseline.
band-metrics:
	node test/band-report.js
