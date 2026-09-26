import importlib.util
import json
import re
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://simoncos.github.io"
NAV = ("index.html", "blogs.html", "gallery.html", "favorites.html", "about.html")


class TagParser(HTMLParser):
    """Every start tag with its attributes, in document order."""

    def __init__(self):
        super().__init__()
        self.tags = []

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, {key: value or "" for key, value in attrs}))


class FragmentTargetParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.targets = set()

    def handle_starttag(self, _tag, attrs):
        attributes = dict(attrs)
        self.targets.update(
            attributes[key]
            for key in ("id", "name")
            if attributes.get(key)
        )


def tags(html):
    parser = TagParser()
    parser.feed(html)
    return parser.tags


def shell_pages():
    """Every published page that carries the shared shell."""
    config = json.loads((ROOT / "data/site_shell.json").read_text())
    pages = [page["path"] for page in config["pages"] if not page["path"].startswith("templates/")]
    pages += [path.relative_to(ROOT).as_posix() for path in sorted((ROOT / "blogs").glob("*.html"))]
    return pages


def load_module(name, rel_path):
    spec = importlib.util.spec_from_file_location(name, ROOT / rel_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SurfaceContractTests(unittest.TestCase):
    def test_design_tokens_have_one_light_and_one_dark_definition(self):
        css = (ROOT / "src/css/styles.css").read_text()
        light = re.findall(r"(?m)^:root\s*\{(?P<body>.*?)^\}", css, re.S)
        dark = re.findall(r'(?m)^:root\[data-theme="dark"\]\s*\{(?P<body>.*?)^\}', css, re.S)

        self.assertEqual(len(light), 1)
        self.assertEqual(len(dark), 1)
        for token, value in (("--bg", "#ffffff"), ("--ink", "#141414"), ("--pad", "clamp(20px, 4vw, 56px)")):
            with self.subTest(token=token):
                self.assertIn(f"{token}: {value};", light[0])
        for token, value in (("--bg", "#111111"), ("--ink", "#f2f2ef")):
            with self.subTest(token=token, theme="dark"):
                self.assertIn(f"{token}: {value};", dark[0])

    def test_every_page_has_one_main_and_the_shared_header(self):
        for rel_path in shell_pages():
            with self.subTest(page=rel_path):
                html = (ROOT / rel_path).read_text()
                parsed = tags(html)
                self.assertEqual(sum(1 for tag, _ in parsed if tag == "main"), 1)
                for marker in ("resources", "header", "footer"):
                    self.assertIn(f"<!-- site-shell:{marker}:start -->", html)
                nav = html.split('class="hdr-nav"', 1)[1].split("</nav>", 1)[0]
                hrefs = re.findall(r'<a class="tab" href="([^"]+)"', nav)
                self.assertEqual([href.split("/")[-1] for href in hrefs], list(NAV))
                self.assertLessEqual(nav.count('aria-current="page"'), 1)

    def test_pages_load_only_compiled_scripts_that_have_a_source(self):
        for rel_path in shell_pages():
            html = (ROOT / rel_path).read_text()
            for src in re.findall(r'<script[^>]+src="([^"]*src/js/[^"?]+\.js)', html):
                name = Path(src).stem
                with self.subTest(page=rel_path, script=name):
                    self.assertTrue((ROOT / f"src/js/{name}.js").is_file())
                    self.assertTrue((ROOT / f"src/ts/{name}.ts").is_file())

    def test_language_swapped_attributes_are_declared(self):
        # site.js swaps an attribute only when data-i18n names it.
        for rel_path in shell_pages():
            for tag, attrs in tags((ROOT / rel_path).read_text()):
                swapped = {name[len("data-zh-"):] for name in attrs if name.startswith("data-zh-")}
                if not swapped:
                    continue
                with self.subTest(page=rel_path, tag=tag, attrs=sorted(swapped)):
                    self.assertEqual(swapped, set(attrs.get("data-i18n", "").split()))

    def test_articles_are_one_language_per_file_and_link_their_translation(self):
        for path in sorted((ROOT / "blogs").glob("*.html")):
            html = path.read_text()
            with self.subTest(page=path.name):
                page_lang = re.search(r'data-page-lang="(en|zh)"', html).group(1)
                self.assertEqual(page_lang, "en" if path.name.endswith(".en.html") else "zh")
                toggle = re.search(r'<a class="lang-btn" href="([^"]+)"', html).group(1)
                if toggle != "#":
                    self.assertTrue((path.parent / toggle).is_file(), toggle)

    def test_home_stage_follows_site_data(self):
        site = json.loads((ROOT / "data/site.json").read_text())
        html = (ROOT / "index.html").read_text()
        self.assertEqual(html.count('<a class="panel'), len(site["featured"]))
        self.assertEqual(len(re.findall(r'class="sel-bar(?: is-on)?"', html)), len(site["featured"]))

    def test_legacy_series_and_tags_redirect_into_articles(self):
        for page, fragment in (("series.html", "reading-paths"), ("tags.html", "topics")):
            with self.subTest(page=page):
                html = (ROOT / page).read_text()
                self.assertEqual(sum(1 for tag, _ in tags(html) if tag == "main"), 1)
                self.assertIn('href="https://simoncos.github.io/blogs.html"', html)
                self.assertIn(f"blogs.html#{fragment}", html)
                self.assertIn('name="robots" content="noindex"', html)
                self.assertNotIn("simonc site", html)

    def test_retired_runtime_and_data_stay_retired(self):
        retired_paths = (
            "navigation.html",
            "data/blog_data.json",
            "data/article_groups.json",
            "data/content_manifest.json",
            "data/home_surface.json",
            "data/gallery_data.json",
            "data/projects_data.json",
            "scripts/update_static_fallbacks.py",
            "scripts/update_surface_data.py",
            "src/ts/i18n.ts",
            "src/ts/load-nav.ts",
        )
        for rel_path in retired_paths:
            with self.subTest(path=rel_path):
                self.assertFalse((ROOT / rel_path).exists())

    def test_article_public_data_uses_one_lightweight_index(self):
        article_index = json.loads((ROOT / "data/article_index.json").read_text())
        for group in article_index["groups"]:
            for entry in group["languages"].values():
                self.assertNotIn("html_content", entry)
                self.assertNotIn("rendered_content", entry)

        public_orientation = (ROOT / "llms.txt").read_text() + (ROOT / "agent-index.json").read_text()
        self.assertIn("data/article_index.json", public_orientation)
        self.assertNotIn("data/article_groups.json", public_orientation)

    def test_check_target_verifies_generated_javascript_without_rewriting_it(self):
        makefile = (ROOT / "Makefile").read_text()
        check_recipe = makefile.split("check:", 1)[1].split("generate:", 1)[0]
        package = json.loads((ROOT / "package.json").read_text())
        workflow = (ROOT / ".github/workflows/site-check.yml").read_text()
        checker = (ROOT / "scripts/check_typescript_build.py").read_text()

        self.assertIn("npm run check:generated-js -- --scope $(TYPESCRIPT_SCOPE)", check_recipe)
        self.assertNotIn("npm run build:ts", check_recipe)
        self.assertIn("python3 scripts/build_pages.py --check", check_recipe)
        self.assertIn("check-all:", makefile)
        self.assertIn("$(MAKE) check TYPESCRIPT_SCOPE=all", makefile)
        self.assertIn("run: make check-all", workflow)
        self.assertIn('choices=("site", "all")', checker)
        self.assertEqual(
            package["scripts"]["check:generated-js"],
            "python3 scripts/check_typescript_build.py",
        )

    def test_public_and_embedded_html_metadata_policy_is_enforced(self):
        checker = (ROOT / "scripts/check_site.py").read_text()

        self.assertIn('doc.meta(property="og:title")', checker)
        self.assertIn('doc.meta(property="og:description")', checker)
        self.assertIn('doc.meta(property="og:image")', checker)
        self.assertIn("sitemap page must not declare noindex", checker)
        self.assertIn("embedded support page must declare noindex", checker)

    def test_site_checker_skips_nested_worktrees_and_hidden_directories(self):
        check_site = load_module("check_site", "scripts/check_site.py")

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir)
            for rel_path in (
                "index.html",
                "blogs/post.html",
                ".claude/worktrees/feature/index.html",
                ".superpowers/brainstorm/mockup.html",
                "templates/blog-template.html",
                "node_modules/pkg/readme.html",
            ):
                (temp_root / rel_path).parent.mkdir(parents=True, exist_ok=True)
                (temp_root / rel_path).write_text("<!doctype html>")

            check_site.ROOT = temp_root
            found = [path.relative_to(temp_root).as_posix() for path in check_site.iter_html_files()]

        self.assertEqual(found, ["blogs/post.html", "index.html"])

    def test_pretext_runtime_has_one_vendored_source(self):
        package = json.loads((ROOT / "package.json").read_text())
        haba_runtime = (ROOT / "blogs/assets/haba-pretext.ts").read_text()
        sleep_runtime = (ROOT / "projects/assets/sleep-essay-pretext-lab.ts").read_text()

        self.assertNotIn("@chenglou/pretext", package.get("dependencies", {}))
        self.assertIn("projects/assets/vendor/pretext/layout.js", haba_runtime)
        self.assertIn("./vendor/pretext/layout.js", sleep_runtime)
        self.assertTrue((ROOT / "projects/assets/vendor/pretext/LICENSE").is_file())

    def test_machine_readable_same_origin_links_and_fragments_resolve(self):
        llms = (ROOT / "llms.txt").read_text()
        agent_index = json.loads((ROOT / "agent-index.json").read_text())
        urls = set(re.findall(r"\]\((https://simoncos\.github\.io/[^)]+)\)", llms))

        def collect_urls(value):
            if isinstance(value, dict):
                for key, child in value.items():
                    if key == "url" and isinstance(child, str):
                        urls.add(child)
                    else:
                        collect_urls(child)
            elif isinstance(value, list):
                for child in value:
                    collect_urls(child)

        collect_urls(agent_index)
        checked = 0
        for url in sorted(urls):
            parsed = urlsplit(url)
            if f"{parsed.scheme}://{parsed.netloc}" != SITE_ORIGIN:
                continue
            relative_path = unquote(parsed.path.lstrip("/")) or "index.html"
            local_path = ROOT / relative_path
            with self.subTest(url=url):
                self.assertTrue(local_path.is_file(), f"missing same-origin target for {url}")
                if parsed.fragment:
                    parser = FragmentTargetParser()
                    parser.feed(local_path.read_text())
                    self.assertIn(unquote(parsed.fragment), parser.targets)
            checked += 1

        self.assertGreater(checked, 0)


if __name__ == "__main__":
    unittest.main()
