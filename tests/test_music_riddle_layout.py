"""Guard legibility of the authored map as its nodes and routes evolve."""
import copy
import itertools
import math
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from music_riddle_data import load, validate
from music_riddle_layout import route_geometry, sample


class MapClearanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=load()
        cls.nodes={n['id']:n for n in cls.data['nodes']}
        cls.routes=route_geometry(cls.data)

    def test_connections_avoid_unrelated_node_hit_areas(self):
        for edge,segments in self.routes.items():
            points=sample(segments,90)
            for node in self.nodes.values():
                if node['id'] in edge:continue
                clearance=min(math.dist(p,node['position']) for p in points)
                self.assertGreaterEqual(clearance,48,(edge,node['title'],clearance))

    def test_converging_arrows_have_separate_slots(self):
        for (edge,a),(other,b) in itertools.combinations(self.routes.items(),2):
            if edge[1]!=other[1]:continue
            self.assertGreaterEqual(math.dist(a[-1][-1],b[-1][-1]),23,(edge,other))

    def test_node_targets_do_not_overlap(self):
        for a,b in itertools.combinations(self.nodes.values(),2):
            self.assertGreaterEqual(math.dist(a['position'],b['position']),90,(a['title'],b['title']))

    def test_route_metadata_cannot_invent_paths_or_escape_canvas(self):
        for case in ('path','point'):
            data=copy.deepcopy(self.data)
            if case=='path':data['map']['routes']['missing:node']=[[1,2]]
            else:data['map']['routes'][next(iter(data['map']['routes']))]=[[-10,20]]
            with self.assertRaises(ValueError):validate(data)

if __name__=='__main__':unittest.main()
