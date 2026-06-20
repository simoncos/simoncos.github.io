.PHONY: check generate serve

check:
	npm run build:ts
	python3 scripts/update_surface_data.py --check
	python3 scripts/update_site_shell.py --check
	python3 scripts/check_blog_generation.py
	python3 scripts/check_site.py
	python3 scripts/update_static_fallbacks.py --check
	find src/js -name '*.js' -print0 | xargs -0 -n 1 node --check

generate:
	npm run build:ts
	python3 scripts/update_site_shell.py
	python3 generate_blog_pages.py
	python3 scripts/update_surface_data.py
	python3 scripts/update_static_fallbacks.py

serve:
	python3 -m http.server 8000
