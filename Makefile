.PHONY: smoke sets classroom-fit accompaniment-audit coverage-map

sets:
	node course/holding/build.js
	node course/review/build.js
	node course/build-sets.js

classroom-fit:
	node course/classroom-fit.js --md course/classroom-fit.md

accompaniment-audit:
	node course/accompaniment-audit.js --md course/accompaniment-audit.md

coverage-map:
	node course/coverage-map.js --md course/coverage-map.md

smoke:
	node test/smoke.js
