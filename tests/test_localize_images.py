import importlib.util
import io
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import localize_images  # noqa: E402

try:
    from PIL import Image
except ImportError:  # CI installs only what the build needs
    Image = None

R2 = "https://pub-0123abcd.r2.dev/obsidian/2026/03"


def load_check_site():
    spec = importlib.util.spec_from_file_location("check_site", ROOT / "scripts/check_site.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class LocalizeImagesTests(unittest.TestCase):
    def test_an_article_is_named_by_its_slug_in_any_form(self):
        for value in ("foo", "blogs/foo.md", "blogs/foo.en.md", "foo.en.md"):
            with self.subTest(value=value):
                self.assertEqual(localize_images.slug_from_arg(value), "foo")
        slug = "my-personal-knowledge-management-system-2026-03"
        self.assertEqual(localize_images.slug_from_arg(f"blogs/{slug}.en.md"), slug)

    def test_only_r2_images_are_collected_once_in_order(self):
        text = (
            "---\ntitle: T\n---\n"
            f"![a]({R2}/aaa.jpg)\n"
            f'<img src="{R2}/bbb.PNG" alt="b">\n'
            f"[the PDF]({R2}/notes.pdf)\n"
            "![elsewhere](https://example.com/c.jpg)\n"
            f"![a again]({R2}/aaa.jpg)\n"
        )
        self.assertEqual(localize_images.r2_image_urls(text), [f"{R2}/aaa.jpg", f"{R2}/bbb.PNG"])

    def test_references_are_rewritten_to_the_repository_copy(self):
        url = f"{R2}/6fa962ae4c7f1c6ab8ed3d5ad49d6ce8.jpg"
        name = localize_images.local_name(url, ".jpg")
        self.assertEqual(name, "6fa962ae4c7f1c6ab8ed3d5ad49d6ce8.jpg")
        rel = f"assets/images/post/{name}"
        self.assertEqual(localize_images.rewrite(f"![bird]({url})", {url: rel}), f"![bird]({rel})")

    @unittest.skipUnless(Image, "Pillow is not installed")
    def test_a_large_photo_is_fitted_and_kept_under_the_limit(self):
        noise = Image.effect_noise((3000, 4000), 60).convert("RGB")
        source = io.BytesIO()
        noise.save(source, "JPEG", quality=95)

        data, extension, _how = localize_images.encode(source.getvalue(), ".jpg")
        result = Image.open(io.BytesIO(data))

        self.assertEqual((extension, result.format), (".jpg", "JPEG"))
        self.assertLessEqual(result.width, localize_images.MAX_WIDTH)
        self.assertLessEqual(result.height, localize_images.MAX_HEIGHT)
        self.assertTrue(result.info.get("progressive"))
        self.assertLessEqual(len(data), localize_images.MAX_BYTES)

    @unittest.skipUnless(Image, "Pillow is not installed")
    def test_transparency_stays_a_png(self):
        image = Image.new("RGBA", (40, 40), (255, 0, 0, 0))
        source = io.BytesIO()
        image.save(source, "PNG")

        _data, extension, how = localize_images.encode(source.getvalue(), ".png")

        self.assertEqual(extension, ".png")
        self.assertIn("transparency", how)


class ArticleImageCheckTests(unittest.TestCase):
    def test_an_article_image_over_one_megabyte_fails_the_check(self):
        check_site = load_check_site()
        with tempfile.TemporaryDirectory() as temp_dir:
            # Resolved, as ROOT is: on macOS the temp dir sits behind a symlink.
            temp_root = Path(temp_dir).resolve()
            (temp_root / "blogs/assets/images/post").mkdir(parents=True)
            (temp_root / "blogs/assets/images/post/big.jpg").write_bytes(b"\0" * 1_100_000)
            (temp_root / "blogs/assets/images/post/small.jpg").write_bytes(b"\0" * 1_000)
            (temp_root / "blogs/post.html").write_text(
                "<!doctype html>"
                '<img src="assets/images/post/big.jpg" alt="big" decoding="async" width="1" height="1">'
                '<img src="assets/images/post/small.jpg" alt="small" decoding="async" loading="lazy"'
                ' width="1" height="1">'
            )
            check_site.ROOT = temp_root
            errors = []
            check_site.check_blog_image_attributes(errors)

        self.assertEqual(len(errors), 1)
        self.assertIn("big.jpg", errors[0])
        self.assertIn("1.1 MB", errors[0])


if __name__ == "__main__":
    unittest.main()
