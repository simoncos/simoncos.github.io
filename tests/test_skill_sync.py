import importlib.util
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("sync_skills", ROOT / "scripts/sync_skills.py")
sync_skills = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync_skills)


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


class SkillSyncTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.claude = self.root / ".claude/skills/demo"
        self.agents = self.root / ".agents/skills/demo"
        for base in (self.claude, self.agents):
            write(base / "SKILL.md", "v1\n")
            write(base / "scripts/tool.py", "print(1)\n")
        write(self.agents / "agents/openai.yaml", "interface: {}\n")

    def tearDown(self):
        self.tmp.cleanup()

    def test_the_repository_copies_match(self):
        self.assertEqual(sync_skills.problems(), [])

    def test_matching_copies_pass_and_codex_metadata_is_not_compared(self):
        write(self.claude / "__pycache__/tool.pyc", "x")
        self.assertEqual(sync_skills.problems(self.root), [])

    def test_an_edit_on_one_side_is_reported_and_synced_over(self):
        write(self.claude / "SKILL.md", "v2\n")
        write(self.claude / "references/new.md", "new\n")
        (self.claude / "scripts/tool.py").unlink()
        self.assertEqual(sync_skills.problems(self.root), [
            "demo/references/new.md: missing from .agents/skills/",
            "demo/scripts/tool.py: missing from .claude/skills/",
            "demo/SKILL.md: differs between the two copies",
        ])
        sync_skills.sync("claude", self.root)
        self.assertEqual(sync_skills.problems(self.root), [])
        self.assertEqual((self.agents / "SKILL.md").read_text(), "v2\n")
        self.assertFalse((self.agents / "scripts/tool.py").exists())
        self.assertTrue((self.agents / "agents/openai.yaml").is_file())

    def test_codex_edits_sync_back(self):
        write(self.agents / "SKILL.md", "from codex\n")
        sync_skills.sync("agents", self.root)
        self.assertEqual((self.claude / "SKILL.md").read_text(), "from codex\n")
        self.assertFalse((self.claude / "agents").exists())

    def test_a_skill_in_one_copy_only_and_missing_codex_metadata_fail(self):
        write(self.root / ".claude/skills/solo/SKILL.md", "solo\n")
        self.assertEqual(sync_skills.problems(self.root), ["solo: missing from .agents/skills/"])
        sync_skills.sync("claude", self.root)
        self.assertEqual(sync_skills.problems(self.root), [
            "solo: .agents/skills/solo/agents/openai.yaml is missing",
        ])


if __name__ == "__main__":
    unittest.main()
