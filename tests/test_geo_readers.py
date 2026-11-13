"""Evidence denominators and companion provenance remain consistent."""
import json
import sys
import unittest
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from build_sleep_evidence import payload,summary

class Readers(unittest.TestCase):
    def test_evidence_counts_and_fingerprint_match_existing_public_data(self):
        expected=summary(payload());actual=json.loads((ROOT/'gallery/research/assets/sleep-evidence.json').read_text())
        self.assertEqual(actual,expected);self.assertEqual(actual['records'],3656);self.assertEqual(actual['distinct_record_dates'],2963)
        self.assertEqual([r['bd_n']for r in actual['bd_years']],[326,361,361,78])
        for suffix in ('','.en'):
            soup=BeautifulSoup((ROOT/f'gallery/research/sleep-2016-2026{suffix}.html').read_text(),'html.parser')
            details=soup.select_one('#evidence-details');self.assertIsNotNone(details)
            self.assertIn('2,963',details.get_text());self.assertEqual(len(details.select('tr[id^="tag-"]')),6)
            self.assertIn('public-summary-v1',details.get_text());self.assertIn('Che Zhao',details.get_text())

    def test_readers_explain_versions_and_have_work_entrypoints(self):
        site=json.loads((ROOT/'data/site.json').read_text());source=json.loads((ROOT/'data/topic_readers.json').read_text())
        for reader in source['readers']:
            for lang in ('en','zh'):
                path=f'topics/{reader["id"]}{".en"if lang=="en"else""}.html'
                soup=BeautifulSoup((ROOT/path).read_text(),'html.parser')
                self.assertEqual(soup.html['lang'],'en'if lang=='en'else'zh-Hans')
                self.assertTrue(all(soup.select_one('#'+part['id']) for part in reader['sections']))
                self.assertIn(path,str([topic.get('related')for topic in site['work_topics']]))
                for link in soup.select('main a[href]'):
                    url=link['href'].split('#')[0]
                    if url:self.assertTrue((ROOT/path).parent.joinpath(url).exists(),url)
        text=(ROOT/'topics/personal-ai-system.en.html').read_text();self.assertIn('/j, not !j',text)
        self.assertIn('not supply complete provider versions',text)

    def test_collection_omits_unavailable_work_and_keeps_review_state(self):
        site=json.loads((ROOT/'data/site.json').read_text());expected={w['title']['en']for w in site['works']if w.get('href')}
        soup=BeautifulSoup((ROOT/'gallery.html').read_text(),'html.parser');data=json.loads(soup.select_one('script[type="application/ld+json"]').string)
        self.assertEqual({n['name']for n in data['mainEntity']['itemListElement']},expected)
        work_index=json.loads((ROOT/'agent-index.json').read_text())['works']
        self.assertEqual(sum(w['state']=='in_progress'for w in work_index),11)
        self.assertEqual(next(w['state']for w in work_index if w['id']=='hn-llm-research'),'public_review')

if __name__=='__main__':unittest.main()
