import type {Network, NetworkNode} from "./data";
interface Controls { network: () => Network | null; view: () => {zoom: number; pan: {x: number; y: number}}; index: () => {incoming: Set<number>[]; outgoing: Set<number>[]; reciprocal: number[]}; mode: () => string; selected: () => number; format: (value: number) => string; nameAt: (id: number) => string | null | undefined; t: (en: string, zh: string) => string }
export function createNetworkRenderer(ctx: CanvasRenderingContext2D, stage: HTMLElement, canvas: HTMLCanvasElement, controls: Controls) {
    const {mode, selected, t, format, nameAt} = controls;
    let width = 0, height = 0;
    function point(node: NetworkNode) {
        const {zoom, pan} = controls.view();
        const size = Math.min(width, height) * .94;
        return {x: (width / 2 + (node[0] - .5) * size - width / 2) * zoom + width / 2 + pan.x,
                y: (height / 2 + (node[1] - .5) * size - height / 2) * zoom + height / 2 + pan.y};
    }
    function line(a: {x: number; y: number}, b: {x: number; y: number}, arrow = false) {
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        if (arrow) {
            const angle = Math.atan2(b.y-a.y, b.x-a.x), inset = 10;
            const x = b.x-Math.cos(angle)*inset, y = b.y-Math.sin(angle)*inset;
            ctx.moveTo(x-7*Math.cos(angle-.4),y-7*Math.sin(angle-.4)); ctx.lineTo(x,y);
            ctx.lineTo(x-7*Math.cos(angle+.4),y-7*Math.sin(angle+.4));
        }
    }
    function text(value: string, x: number, y: number, size = 12) {
        ctx.font = `${size}px ui-monospace, monospace`; ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = '#111d2b'; ctx.strokeText(value, x, y);
        ctx.fillStyle = '#edf3f7'; ctx.fillText(value, x, y);
    }
    function groupView(data: Network) {
        const centers = data.groups.map(group => {
            const rows = data.nodes.filter(row => row[2] === group.id);
            const x = rows.reduce((sum, row) => sum+row[0],0)/rows.length;
            const y = rows.reduce((sum, row) => sum+row[1],0)/rows.length;
            return point([x,y,group.id,0,0]);
        });
        const maximum = Math.max(...data.group_links.flat());
        for (let a=0; a<centers.length; a++) for (let b=a+1; b<centers.length; b++) {
            const count = data.group_links[a][b] + data.group_links[b][a];
            if (!count) continue;
            const aa = centers[a], bb = centers[b], dx = bb.x-aa.x, dy = bb.y-aa.y;
            const distance = Math.max(Math.hypot(dx,dy),1), bend = 22;
            const mid = {x:(aa.x+bb.x)/2-dy/distance*bend, y:(aa.y+bb.y)/2+dx/distance*bend};
            ctx.beginPath(); ctx.moveTo(aa.x,aa.y); ctx.quadraticCurveTo(mid.x,mid.y,bb.x,bb.y);
            ctx.strokeStyle = '#6d91a6'; ctx.lineWidth = .8 + 9*Math.sqrt(count/(2*maximum)); ctx.globalAlpha=.65;ctx.stroke();ctx.globalAlpha=1;
            text(format(count), (aa.x+2*mid.x+bb.x)/4, (aa.y+2*mid.y+bb.y)/4, width<500?9:12);
        }
        data.groups.forEach((group,i)=>{
            const p=centers[i], radius = (width<500?42:74)*Math.sqrt(group.size/data.groups[0].size);
            ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fillStyle=group.color;ctx.fill();
            ctx.strokeStyle='#111d2b';ctx.lineWidth=3;ctx.stroke();
            if(radius<25){text(t('G','组 ')+(i+1)+' · '+format(group.size),p.x,p.y+radius+17,10);}
            else{
                ctx.textAlign='center';ctx.fillStyle='#111d2b';ctx.font=`600 ${width<500?11:15}px sans-serif`;
                ctx.fillText(t(width<500?'G':'Group ','组 ')+(i+1),p.x,p.y-4);
                ctx.font=`${width<500?10:13}px ui-monospace, monospace`;ctx.fillText(format(group.size),p.x,p.y+15);
            }
        });
    }
    function draw() {
        const data=controls.network();
        const {zoom}=controls.view();
        const {incoming, outgoing, reciprocal}=controls.index();
        if (!data) return;
        width = stage.clientWidth; height = canvas.clientHeight;
        const ratio = Math.min(devicePixelRatio || 1,2);
        canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
        ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
        if (mode()==='groups') {groupView(data);return;}
        const current=selected(), focus=current>=0 && current<data.nodes.length;
        const points=data.nodes.map(point);
        const links=mode()==='mutual'?reciprocal:data.edges;
        const stride=Math.max(1,Math.ceil(links.length/2/12000));
        // Bound context ink, never invent an edge. Focus draws every neighbour.
        const paths=data.groups.map(()=>new Path2D()), external=new Path2D();
        for(let i=0;i<links.length;i+=2*stride){
            const a=links[i],b=links[i+1],path=data.nodes[a][2]===data.nodes[b][2]?paths[data.nodes[a][2]]:external;
            path.moveTo(points[a].x,points[a].y);path.lineTo(points[b].x,points[b].y);
        }
        ctx.lineWidth=.75;ctx.globalAlpha=focus ? .035 : .22;
        paths.forEach((path,i)=>{ctx.strokeStyle=data.groups[i].color;ctx.stroke(path);});
        ctx.strokeStyle='#829fb4';ctx.globalAlpha=focus ? .025 : .21;ctx.stroke(external);ctx.globalAlpha=1;
        const neighbours=focus?new Set([...incoming[current],...outgoing[current]]):new Set<number>();
        if(focus){
            neighbours.forEach(id=>{
                const isIn=incoming[current].has(id),isOut=outgoing[current].has(id);
                ctx.strokeStyle=isIn&&isOut?'#e6cc78':isIn?'#71c9de':'#f39178';ctx.lineWidth=1.25;ctx.globalAlpha=.65;ctx.beginPath();
                line(isIn?points[id]:points[current],isIn?points[current]:points[id],true);
                if(isIn&&isOut)line(points[current],points[id],true);
                ctx.stroke();
            });ctx.globalAlpha=1;
        }
        const maximum=data.nodes[0][3];
        // Paint small nodes first, then the highly connected nodes.
        for(let i=data.nodes.length-1;i>=0;i--){
            const node=data.nodes[i],p=points[i];
            if(p.x < -20 || p.x>width+20 || p.y< -20 || p.y>height+20)continue;
            ctx.globalAlpha=focus&&i!==current&&!neighbours.has(i) ? .17 : 1;
            const radius=(data.node_count>500?1.3:2)+Math.sqrt(node[3]/maximum)*5;
            ctx.beginPath();ctx.arc(p.x,p.y,radius*Math.sqrt(zoom),0,Math.PI*2);
            ctx.fillStyle=data.groups[node[2]].color;ctx.fill();ctx.strokeStyle='#111d2b';ctx.lineWidth=.8;ctx.stroke();
        }ctx.globalAlpha=1;
        if(focus){const p=points[current];ctx.beginPath();ctx.arc(p.x,p.y,13*Math.sqrt(zoom),0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();text(nameAt(current)||'#'+String(current+1).padStart(3,'0'),p.x,p.y-20*Math.sqrt(zoom));}
        else [0,1,2].forEach(id=>text(nameAt(id)||'#'+String(id+1).padStart(3,'0'),points[id].x,points[id].y-13,10));
    }

    return {draw, point, get width() {return width;}, get height() {return height;}};
}
