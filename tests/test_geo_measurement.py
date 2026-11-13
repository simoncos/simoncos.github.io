"""Unrun/error answers must not inflate citation-rate denominators."""
import copy
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from summarize_geo_measurement import summarize

Q=[{'id':'T1','question':'A fixed question','category':'topic_a','language':'en'}]
BASE={'round':'baseline','product_id':'product-a','question_id':'T1','question':Q[0]['question'],
      'status':'ok','run_at':'2026-10-05T00:00:00+08:00','answer':'Full answer text',
      'context':{'product':'Product A','displayed_model':'not_disclosed','search_mode':'on','region':'HK','login_personalization':'logged out','new_conversation':True},'citations':[]}

class Measurement(unittest.TestCase):
    def test_navigation_and_wrong_citations_do_not_become_substantive_success(self):
        r=copy.deepcopy(BASE);r['citations']=[{'url':'https://simoncos.github.io/','claim':'Author homepage','kind':'navigation','correct':True}, {'url':'https://simoncos.github.io/blogs/example.html','claim':'An unsupported claim','kind':'substantive','correct':False}]
        g=summarize([r],Q)['groups'][0]
        self.assertEqual((g['ok'],g['site_substantive'],g['site_navigation'],g['incorrect_citations']),(1,0,1,1))
        self.assertEqual(g['site_substantive_rate'],0)

    def test_correct_multiple_site_citations_count_one_answer_external_work_is_separate(self):
        r=copy.deepcopy(BASE);r['citations']=[{'url':url,'claim':'Reviewed assertion','kind':'substantive','correct':True}for url in ['https://simoncos.github.io/a.html','https://simoncos.github.io/b.html','https://hn-waywo-dashboard.vercel.app/']]
        g=summarize([r],Q)['groups'][0];self.assertEqual((g['site_substantive'],g['work_substantive']),(1,1));self.assertEqual(g['site_substantive_rate'],1)

    def test_error_and_unrun_have_no_normal_denominator(self):
        rows=[]
        for i,status in enumerate(('error','not_run')):
            r=copy.deepcopy(BASE);r['round']=('baseline','day14')[i];r['status']=status;r['answer']=None;r['errors']=['timeout']if status=='error'else[];rows.append(r)
        report=summarize(rows,Q);self.assertEqual(report['status'],'incomplete')
        self.assertTrue(all(g['site_substantive_rate']is None for g in report['groups']))

    def test_rewritten_questions_duplicates_and_incomplete_evidence_fail(self):
        with self.assertRaises(ValueError):summarize([BASE,BASE],Q)
        for field,value in [('question','A guided question with site URL'),('answer',''),('run_at',None)]:
            r=copy.deepcopy(BASE);r[field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):summarize([r],Q)

if __name__=='__main__':unittest.main()
