.PHONY: smoke sets classroom-fit

sets:
	node course/holding/build.js
	node course/review/build.js
	node course/build-sets.js

classroom-fit:
	node course/classroom-fit.js --md course/classroom-fit.md

smoke:
	node test/smoke.js
