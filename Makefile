test:
	@./node_modules/.bin/mocha \
		--reporter spec \
		--bail \
		--timeout 10s \
		--require test/common.js

.PHONY: test