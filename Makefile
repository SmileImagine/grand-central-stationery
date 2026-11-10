.PHONY: smoke sets

sets:
	node course/holding/build.js
	node course/build-sets.js

smoke:
	node test/smoke.js
