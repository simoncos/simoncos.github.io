"""Check accounting and anonymity of the real published network geometry."""
from collections import Counter
import json
import math
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NetworkAssetsTest(unittest.TestCase):
    def test_directed_edges_degrees_reciprocity_and_groups(self):
        for name, n, e, reciprocal in [('net50k',375,27324,6414),('net10k',1896,231416,35625)]:
            with self.subTest(network=name):
                data=json.loads((ROOT/f'gallery/research/assets/zhihu-{name}.json').read_text())
                self.assertEqual((data['node_count'],data['edge_count']),(n,e))
                edges=list(zip(data['edges'][::2],data['edges'][1::2]))
                self.assertEqual(len(edges),e)
                self.assertEqual(len(set(edges)),e)
                self.assertTrue(all(type(a) is int and type(b) is int and 0<=a<n and 0<=b<n and a!=b for a,b in edges))
                incoming=Counter(b for _,b in edges);outgoing=Counter(a for a,_ in edges)
                self.assertEqual([row[3] for row in data['nodes']],[incoming[i] for i in range(n)])
                self.assertEqual([row[4] for row in data['nodes']],[outgoing[i] for i in range(n)])
                pairs=set(edges)
                self.assertEqual(sum((b,a) in pairs for a,b in pairs)//2,reciprocal)
                self.assertEqual(data['reciprocal_pairs'],reciprocal)
                groups=Counter(row[2] for row in data['nodes'])
                self.assertEqual(groups,{g['id']:g['size'] for g in data['groups']})
                links=Counter((data['nodes'][a][2],data['nodes'][b][2]) for a,b in edges)
                for a,row in enumerate(data['group_links']):
                    for b,count in enumerate(row):self.assertEqual(count,links[a,b])

    def test_geometry_contains_only_numeric_anonymous_nodes(self):
        for name in ['net50k','net10k']:
            data=json.loads((ROOT/f'gallery/research/assets/zhihu-{name}.json').read_text())
            self.assertEqual(data['node_fields'],['x','y','group','in_degree','out_degree'])
            for row in data['nodes']:
                self.assertEqual(len(row),5)
                self.assertTrue(all(type(v) in (int,float) and math.isfinite(v) for v in row))
                self.assertTrue(0<=row[0]<=1 and 0<=row[1]<=1)
            self.assertTrue(all('user_url' not in key and 'user_id' not in key for key in data))
            published=json.loads((ROOT/'data/zhihu-2015.json').read_text())
            names={r['name'] for group in published['rankings'].values() for rows in group.values() for r in rows}
            self.assertTrue(set(data['anchors']).issubset(names))
            self.assertTrue(all(type(i) is int and 1<=i<=data['node_count'] for i in data['anchors'].values()))
            self.assertEqual(len(set(data['anchors'].values())),len(data['anchors']))
            self.assertNotIn('http',json.dumps(data))


if __name__=='__main__':unittest.main()
