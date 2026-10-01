// One retained, anonymous network scene. Layout is prepared offline; no live
// simulation. HTML owns controls, values and the static SVG fallback.
(function () {
    type Node = [number, number, number, number, number];
    interface Network {
        cohort: string; node_count: number; edge_count: number; reciprocal_pairs: number;
        nodes: Node[]; edges: number[];
        groups: Array<{id: number; size: number; color: string}>;
        group_links: number[][];
        anchors: Record<string,number>;
    }
    const root = document.querySelector<HTMLElement>('.zr-main');
    const reader = document.querySelector<HTMLElement>('.zr-network-reader');
    const stage = document.querySelector<HTMLElement>('.zr-network-stage');
    const canvas = document.querySelector<HTMLCanvasElement>('#zr-network-canvas');
    const ctx = canvas?.getContext('2d');
    if (!root || !reader || !stage || !canvas || !ctx) return;
    const t = (en: string, zh: string) => window.SITE_SHELL?.lang === 'zh' ? zh : en;
    const format = (value: number) => value.toLocaleString('en-US');
    const numberInput = document.querySelector<HTMLInputElement>('#zr-node-number');
    const anchorSelect = document.querySelector<HTMLSelectElement>('#zr-network-anchor');
    const caches = new Map<string, Promise<Network>>();
    let network: Network | null = null;
    let incoming: Set<number>[] = [], outgoing: Set<number>[] = [], reciprocal: number[] = [];
    let zoom = 1, pan = {x: 0, y: 0}, width = 0, height = 0, request = 0, cohort = '', lastView = '', lastNode = '';
    let drag: {x: number; y: number; moved: boolean; panX: number; panY: number; mouse: boolean} | null = null;
    const selected = () => Number(root.dataset.graphNode || 0) - 1;
    const mode = () => root.dataset.graphView || 'mutual';
    const nameAt = (id: number) => network && Object.keys(network.anchors).find(name=>network.anchors[name]===id+1);
    function change(detail: {node: string}) {
        // Inspecting a user opens all of their real incoming/outgoing links.
        root.dispatchEvent(new CustomEvent('zrnetworkchange', {detail: {...detail, ...(detail.node ? {person:nameAt(Number(detail.node)-1)||''} : {}), ...(detail.node && mode()!=='all' ? {view:'all'} : {})}}));
    }
    function bringGraph() {
        canvas.focus({preventScroll:true});
        stage.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    }
    function point(node: Node) {
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
    function groupView() {
        const centers = network.groups.map(group => {
            const rows = network.nodes.filter(row => row[2] === group.id);
            const x = rows.reduce((sum, row) => sum+row[0],0)/rows.length;
            const y = rows.reduce((sum, row) => sum+row[1],0)/rows.length;
            return point([x,y,group.id,0,0]);
        });
        const maximum = Math.max(...network.group_links.flat());
        for (let a=0; a<centers.length; a++) for (let b=a+1; b<centers.length; b++) {
            const count = network.group_links[a][b] + network.group_links[b][a];
            if (!count) continue;
            const aa = centers[a], bb = centers[b], dx = bb.x-aa.x, dy = bb.y-aa.y;
            const distance = Math.max(Math.hypot(dx,dy),1), bend = 22;
            const mid = {x:(aa.x+bb.x)/2-dy/distance*bend, y:(aa.y+bb.y)/2+dx/distance*bend};
            ctx.beginPath(); ctx.moveTo(aa.x,aa.y); ctx.quadraticCurveTo(mid.x,mid.y,bb.x,bb.y);
            ctx.strokeStyle = '#6d91a6'; ctx.lineWidth = .8 + 9*Math.sqrt(count/(2*maximum)); ctx.globalAlpha=.65;ctx.stroke();ctx.globalAlpha=1;
            text(format(count), (aa.x+2*mid.x+bb.x)/4, (aa.y+2*mid.y+bb.y)/4, width<500?9:12);
        }
        network.groups.forEach((group,i)=>{
            const p=centers[i], radius = (width<500?42:74)*Math.sqrt(group.size/network.groups[0].size);
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
        if (!network) return;
        width = stage.clientWidth; height = canvas.clientHeight;
        const ratio = Math.min(devicePixelRatio || 1,2);
        canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
        ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
        if (mode()==='groups') {groupView();return;}
        const current=selected(), focus=current>=0 && current<network.nodes.length;
        const points=network.nodes.map(point);
        const links=mode()==='mutual'?reciprocal:network.edges;
        const stride=Math.max(1,Math.ceil(links.length/2/12000));
        // Bound context ink, never invent an edge. Focus draws every neighbour.
        const paths=network.groups.map(()=>new Path2D()), external=new Path2D();
        for(let i=0;i<links.length;i+=2*stride){
            const a=links[i],b=links[i+1],path=network.nodes[a][2]===network.nodes[b][2]?paths[network.nodes[a][2]]:external;
            path.moveTo(points[a].x,points[a].y);path.lineTo(points[b].x,points[b].y);
        }
        ctx.lineWidth=.75;ctx.globalAlpha=focus ? .035 : .22;
        paths.forEach((path,i)=>{ctx.strokeStyle=network.groups[i].color;ctx.stroke(path);});
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
        const maximum=network.nodes[0][3];
        // Paint small nodes first, then the highly connected nodes.
        for(let i=network.nodes.length-1;i>=0;i--){
            const node=network.nodes[i],p=points[i];
            if(p.x < -20 || p.x>width+20 || p.y< -20 || p.y>height+20)continue;
            ctx.globalAlpha=focus&&i!==current&&!neighbours.has(i) ? .17 : 1;
            const radius=(network.node_count>500?1.3:2)+Math.sqrt(node[3]/maximum)*5;
            ctx.beginPath();ctx.arc(p.x,p.y,radius*Math.sqrt(zoom),0,Math.PI*2);
            ctx.fillStyle=network.groups[node[2]].color;ctx.fill();ctx.strokeStyle='#111d2b';ctx.lineWidth=.8;ctx.stroke();
        }ctx.globalAlpha=1;
        if(focus){const p=points[current];ctx.beginPath();ctx.arc(p.x,p.y,13*Math.sqrt(zoom),0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();text(nameAt(current)||'#'+String(current+1).padStart(3,'0'),p.x,p.y-20*Math.sqrt(zoom));}
        else [0,1,2].forEach(id=>text(nameAt(id)||'#'+String(id+1).padStart(3,'0'),points[id].x,points[id].y-13,10));
    }
    function updateInspector() {
        if (!network) return;
        const current=selected(), focus=current>=0&&current<network.node_count&&mode()!=='groups';
        const title=document.getElementById('zr-node-title'),description=document.getElementById('zr-node-description'),stats=document.getElementById('zr-node-stats');
        title.textContent=focus?(nameAt(current)||t('User #','节点 #')+String(current+1).padStart(3,'0')):mode()==='groups'?t('Connections between groups','分组怎样相连？'):t('Who connects to whom?','谁和谁相连？');
        description.textContent=focus?t('All incoming and outgoing connections of this user, inside the selected network.','这个节点在所选网络内的全部关注与被关注连接。'):mode()==='groups'?t('Each circle gathers a structural group. Circle area represents users; lines count following links in both directions. Internal links stay inside the circles.','每个圆汇总一个结构分组。圆的面积表示人数；连线数字为两个方向的关注总数。组内连接未画在组间。'):t('Each dot is a user. Start with a published name or a number to explore their neighbours.','每个点是一名用户。从原文人物或编号出发，查看他的连接。');
        const values=focus?[[t('Followed by','被关注'),network.nodes[current][3]],[t('Following','关注'),network.nodes[current][4]],[t('Mutual neighbours','互相关注'),[...incoming[current]].filter(i=>outgoing[current].has(i)).length]]:[[t('Users','用户'),network.node_count],[t('Following links','关注连接'),network.edge_count],[t('Mutual pairs','互相关注对'),network.reciprocal_pairs]];
        stats.replaceChildren(...values.map(([label,value])=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=String(label);dd.textContent=format(Number(value));row.append(dt,dd);return row;}));
        const key=document.getElementById('zr-network-key');
        const entries=focus?[['#71c9de',t('Follows this user','关注这个节点')],['#f39178',t('Followed by this user','这个节点关注')],['#e6cc78',t('Follows both ways','双方互相关注')]]:network.groups.map((g,i)=>[g.color,t('Group ','分组 ')+(i+1)+' · '+format(g.size)]);
        key.replaceChildren(...entries.map(([color,label])=>{const row=document.createElement('span'),dot=document.createElement('i');dot.style.backgroundColor=color;row.append(dot,document.createTextNode(label));return row;}));
        numberInput.max=String(network.node_count);numberInput.placeholder='1–'+network.node_count;numberInput.value=focus?String(current+1):'';
        const placeholder=document.createElement('option');placeholder.value='';placeholder.disabled=true;placeholder.textContent=t('Choose a published name…','选择原文人物…');
        anchorSelect.replaceChildren(placeholder,...Object.keys(network.anchors).map(name=>{const option=document.createElement('option');option.value=name;option.textContent=name;return option;}));anchorSelect.value=focus?nameAt(current)||'':'';
        const person=document.querySelector<HTMLSelectElement>('#zr-person')?.value;
        const openPerson=document.querySelector<HTMLButtonElement>('[data-open-network-person]');
        openPerson.hidden=!person||!network.anchors[person];openPerson.textContent=t('Explore '+person+' in the network','查看'+person+'的关注网络')+' ↗';
        document.getElementById('zr-graph-count').textContent=network.cohort+' · '+format(network.node_count)+t(' users · ',' 名用户 · ')+format(network.edge_count)+t(' directed links',' 条有向连接');
        document.getElementById('zr-graph-hint').textContent=focus?t('Complete neighbourhood · arrowheads show direction','完整邻居 · 箭头表示方向'):mode()==='groups'?t('Circle = group · line = between-group links','圆 = 分组 · 线 = 组间连接'):t('Tap a dot to follow its connections','点一个节点，沿连接看进去');
        const count=mode()==='mutual'?network.reciprocal_pairs:network.edge_count;
        const stride=Math.max(1,Math.ceil(count/12000)),drawn=Math.ceil(count/stride);
        document.getElementById('zr-network-status').textContent=mode()==='groups'?t('Groups are computed, not named social communities.','分组由算法计算，不是已命名的真实社群。'):focus?t('Complete neighbourhood; overview ink is subdued.','完整显示邻居，背景概览已淡化。'):t('Overview: ','概览绘制 ')+format(drawn)+t(' real links/pairs. Select a dot for every connection.',' 条真实连线。选中节点后显示全部连接。');
        const valuesDisclosure=root.querySelector<HTMLElement>('[data-group-values]');
        valuesDisclosure.hidden=mode()!=='groups';
        if(mode()==='groups'){
            const table=document.createElement('table'),caption=document.createElement('caption');
            caption.textContent=t('Row follows column. Diagonal cells count internal links.','行关注列。对角线为组内连接。');table.append(caption);
            const head=document.createElement('tr');
            [t('From / to','从 / 到'),...network.groups.map((_,i)=>t('Group ','组 ')+(i+1))].forEach(label=>{const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th);});
            const thead=document.createElement('thead');thead.append(head);table.append(thead);
            const tbody=document.createElement('tbody');network.group_links.forEach((values,i)=>{const row=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=t('Group ','组 ')+(i+1);row.append(th);values.forEach(value=>{const cell=document.createElement('td');cell.textContent=format(value);row.append(cell);});tbody.append(row);});table.append(tbody);
            document.getElementById('zr-group-table').replaceChildren(table);
        }
    }
    async function update() {
        const next=root.dataset.graphCohort||'Net50k';
        if(mode()!==lastView){zoom=1;pan={x:0,y:0};lastView=mode();}
        if(root.dataset.graphNode!==lastNode){lastNode=root.dataset.graphNode;if(zoom>1&&network)scale(1);}
        if(next===cohort&&network){updateInspector();draw();return;}
        const token=++request;cohort=next;network=null;zoom=1;pan={x:0,y:0};reader.classList.remove('zr-network-loaded');
        reader.querySelectorAll<HTMLElement>('[data-graph-fallback]').forEach(el=>el.hidden=el.dataset.graphFallback!==next);
        document.getElementById('zr-node-stats').replaceChildren();
        document.getElementById('zr-node-title').textContent=t('Archived network','归档网络');
        document.getElementById('zr-node-description').textContent=t('Reading interactive data; the static overview remains visible.','交互数据读取中，静态概览仍可阅读。');
        document.getElementById('zr-network-key').replaceChildren();
        document.querySelector<HTMLElement>('[data-open-network-person]').hidden=true;
        document.getElementById('zr-network-status').textContent=t('Loading the archived network…','正在读取归档网络…');
        if(!caches.has(next))caches.set(next,fetch(`assets/zhihu-${next.toLowerCase()}.json?v=20261001b`).then(async response=>{
            if(!response.ok)throw new Error('Network unavailable');
            const data=await response.json() as Network;
            if(data.cohort!==next||data.nodes.length!==data.node_count||data.edges.length!==data.edge_count*2)throw new Error('Invalid network');
            return data;
        }));
        try{
            const data=await caches.get(next);if(token!==request)return;network=data;
            incoming=data.nodes.map(()=>new Set<number>());outgoing=data.nodes.map(()=>new Set<number>());
            for(let i=0;i<data.edges.length;i+=2){const a=data.edges[i],b=data.edges[i+1];outgoing[a].add(b);incoming[b].add(a);}
            reciprocal=[];outgoing.forEach((rows,a)=>rows.forEach(b=>{if(a<b&&outgoing[b].has(a))reciprocal.push(a,b);}));
            reader.classList.add('zr-network-loaded');updateInspector();draw();
        }catch(_){if(token!==request)return;caches.delete(next);document.getElementById('zr-node-description').textContent=t('Read the static overview, or switch to the other network.','可阅读静态图，或切换另一张网络。');document.getElementById('zr-network-status').textContent=t('Interactive data unavailable. The real static network remains visible.','交互数据暂时不可用，仍可阅读真实网络的静态图。');}
    }
    function scale(delta: number){zoom=Math.max(1,Math.min(4,zoom*delta));const current=selected();if(zoom===1){pan={x:0,y:0};}else if(current>=0&&network){const n=network.nodes[current],size=Math.min(width,height)*.94;pan={x:-(n[0]-.5)*size*zoom,y:-(n[1]-.5)*size*zoom};}draw();}
    document.getElementById('zr-node-form')?.addEventListener('submit',event=>{event.preventDefault();if(!network||!numberInput.reportValidity())return;const value=Number(numberInput.value);if(Number.isInteger(value)&&value>=1&&value<=network.node_count){change({node:String(value)});bringGraph();}});
    anchorSelect?.addEventListener('change',()=>{const id=network?.anchors[anchorSelect.value];if(id){change({node:String(id)});bringGraph();}});
    document.querySelector('[data-open-network-person]')?.addEventListener('click',()=>{const person=document.querySelector<HTMLSelectElement>('#zr-person')?.value;const id=network?.anchors[person];if(id){change({node:String(id)});bringGraph();}});
    root.querySelector('[data-clear-node]')?.addEventListener('click',()=>{zoom=1;pan={x:0,y:0};change({node:''});bringGraph();});
    root.querySelectorAll<HTMLButtonElement>('[data-graph-tool]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.graphTool==='reset'){zoom=1;pan={x:0,y:0};draw();}else scale(button.dataset.graphTool==='in'?1.4:1/1.4);}));
    canvas.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY,moved:false,panX:pan.x,panY:pan.y,mouse:event.pointerType==='mouse'};if(drag.mouse&&zoom>1)canvas.setPointerCapture(event.pointerId);});
    canvas.addEventListener('pointermove',event=>{if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag.moved||=Math.hypot(dx,dy)>6;if(drag.mouse&&zoom>1){pan={x:drag.panX+dx,y:drag.panY+dy};draw();}});
    canvas.addEventListener('pointerup',event=>{const was=drag;drag=null;if(!was||was.moved||!network||mode()==='groups')return;const box=canvas.getBoundingClientRect(),x=event.clientX-box.left,y=event.clientY-box.top;let nearest=-1,distance=22;network.nodes.forEach((node,i)=>{const p=point(node),d=Math.hypot(p.x-x,p.y-y);if(d<distance){nearest=i;distance=d;}});if(nearest>=0)change({node:String(nearest+1)});});
    canvas.addEventListener('pointercancel',()=>drag=null);canvas.addEventListener('lostpointercapture',()=>drag=null);
    canvas.addEventListener('keydown',event=>{if(!network)return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const step=event.key==='ArrowRight'?1:-1,current=selected();const next=current<0?(step>0?0:network.node_count-1):(current+step+network.node_count)%network.node_count;change({node:String(next+1)});}else if(event.key==='+'||event.key==='='){event.preventDefault();scale(1.4);}else if(event.key==='-'){event.preventDefault();scale(1/1.4);}else if(event.key==='Escape'){event.preventDefault();zoom=1;pan={x:0,y:0};change({node:''});}});
    root.addEventListener('zrstate',()=>void update());new ResizeObserver(()=>draw()).observe(stage);
    void update();
})();
