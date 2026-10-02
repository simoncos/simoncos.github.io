"""Smooth, authored graph routes with node clearance and stable label placement."""
import math


def lerp(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def point(curve, t):
    a, b, c, d = curve
    return tuple((1-t)**3*a[i]+3*(1-t)**2*t*b[i]+3*(1-t)*t*t*c[i]+t**3*d[i] for i in (0, 1))


def split(curve, t):
    a, b, c, d = curve
    ab, bc, cd = lerp(a,b,t), lerp(b,c,t), lerp(c,d,t)
    abc, bcd = lerp(ab,bc,t), lerp(bc,cd,t)
    p = lerp(abc,bcd,t)
    return (a,ab,abc,p), (p,bcd,cd,d)


def curves(start, end, via=(), inset=True):
    points = [tuple(start), *map(tuple, via), tuple(end)]
    result = []
    for i in range(len(points)-1):
        a, b = points[i:i+2]
        previous = points[max(0,i-1)]
        following = points[min(len(points)-1,i+2)]
        # Soft Catmull-Rom tangents give continuous petals without elbow turns.
        c1 = tuple(a[k]+(b[k]-previous[k])*.15 for k in (0,1))
        c2 = tuple(b[k]-(following[k]-a[k])*.15 for k in (0,1))
        result.append((a,c1,c2,b))
    if inset:
        # Trim the curve itself, not a straight-line approximation to its tangent.
        for reverse, radius in ((False,36), (True,48)):
            if reverse:
                result = [tuple(reversed(c)) for c in reversed(result)]
            center = result[0][0]
            while len(result)>1 and math.dist(center,result[0][-1])<radius:
                result.pop(0)
            lo, hi = 0., 1.
            for _ in range(24):
                mid=(lo+hi)/2
                if math.dist(center,point(result[0],mid))<radius:lo=mid
                else:hi=mid
            result[0]=split(result[0],hi)[1]
            if reverse:
                result = [tuple(reversed(c)) for c in reversed(result)]
    return result


def svg_path(segments):
    def xy(p):return f'{p[0]:.2f},{p[1]:.2f}'
    return 'M'+xy(segments[0][0])+''.join(' C'+' '.join(xy(p) for p in c[1:]) for c in segments)


def route_geometry(data):
    nodes={n['id']:n for n in data['nodes']}
    routes=data['map'].get('routes',{})
    geometry={(n['id'],target):curves(n['position'],nodes[target]['position'],routes.get(n['id']+':'+target,()),inset=False)
              for n in nodes.values() for target in n['next']}
    # Spread both incoming and outgoing ports, so arrowheads never share a slot.
    for node in nodes.values():
        center=node['position']; ports=[]
        for edge,segments in geometry.items():
            source=edge[0]==node['id']; target=edge[1]==node['id']
            if source or target:
                control=segments[0][1] if source else segments[-1][2]
                angle=math.atan2(control[1]-center[1],control[0]-center[0])%(2*math.pi)
                ports.append([angle,edge,source,max(75,min(140,math.dist(center,control)))])
        for _ in range(100):
            ports.sort(key=lambda p:p[0]); changed=False
            if len(ports)<2:break
            for i in range(len(ports)):
                j=(i+1)%len(ports); gap=(ports[j][0]-ports[i][0])%(2*math.pi)
                if gap<.80:
                    delta=(.80-gap)/2+.0001
                    ports[i][0]=(ports[i][0]-delta)%(2*math.pi)
                    ports[j][0]=(ports[j][0]+delta)%(2*math.pi); changed=True
            if not changed:break
        for angle,edge,source,length in ports:
            index=0 if source else -1; segment=list(geometry[edge][index])
            segment[1 if source else 2]=(center[0]+math.cos(angle)*length,center[1]+math.sin(angle)*length)
            geometry[edge][index]=tuple(segment)
    for edge,segments in geometry.items():
        for reverse,radius in ((False,36),(True,48)):
            if reverse:segments=[tuple(reversed(c)) for c in reversed(segments)]
            center=segments[0][0];lo,hi=0.,1.
            for _ in range(24):
                mid=(lo+hi)/2
                if math.dist(center,point(segments[0],mid))<radius:lo=mid
                else:hi=mid
            segments[0]=split(segments[0],hi)[1]
            if reverse:segments=[tuple(reversed(c)) for c in reversed(segments)]
        geometry[edge]=segments
    return geometry


def sample(segments, steps=35):
    return [point(c,i/steps) for c in segments for i in range(steps+1)]


def labels(data, geometry):
    """Place full titles in open space, even while their nodes are undiscovered."""
    traces=[p for route in geometry.values() for p in sample(route)]
    boxes=[]; result={}
    def width(title):return sum(10 if ord(c)<128 else 20 for c in title)+12
    def overlap(a,b):return max(0,min(a[2],b[2])-max(a[0],b[0]))*max(0,min(a[3],b[3])-max(a[1],b[1]))
    ordered=sorted(data['nodes'],key=lambda n:len(n['title']),reverse=True)
    for node in ordered:
        x,y=node['position']; w=width(node['title']); special=node['id'] in (data['start'],data['ending'])
        candidates=[(0,-46 if special else -38,'middle'),(0,88 if special else 52,'middle'),(44,6,'start'),(-44,6,'end'),(32,-31,'start'),(-32,-31,'end'),(32,46,'start'),(-32,46,'end')]
        best=None
        for rank,(dx,dy,anchor) in enumerate(candidates):
            left=x+dx-(w/2 if anchor=='middle' else w if anchor=='end' else 0)
            box=(left,y+dy-23,left+w,y+dy+5)
            cost=rank*.15+sum(overlap(box,b)*6 for b in boxes)
            for other in data['nodes']:
                if other['id']==node['id']:continue
                ox,oy=other['position'];cost+=overlap(box,(ox-38,oy-38,ox+38,oy+38))*12
            cost+=sum(2 for px,py in traces if box[0]-5<px<box[2]+5 and box[1]-5<py<box[3]+5)
            if box[0]<20 or box[2]>data['map']['width']-20:cost+=10000
            if best is None or cost<best[0]:best=(cost,(dx,dy,anchor),box)
        result[node['id']]=best[1]; boxes.append(best[2])
    return result
