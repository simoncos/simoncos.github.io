import { createNetworkRenderer } from "./network/renderer";
import { parseNetwork, indexNetwork } from "./network/data";
import type { Network, NetworkNode as Node } from "./network/data";
import { required, element } from "./lib/dom";
// One retained, anonymous network scene. Layout is prepared offline; no live
// simulation. HTML owns controls, values and the static SVG fallback.
(function () {
    const rootCandidate = document.querySelector<HTMLElement>('.zr-main');
    const readerCandidate = document.querySelector<HTMLElement>('.zr-network-reader');
    const stageCandidate = document.querySelector<HTMLElement>('.zr-network-stage');
    const canvasCandidate = document.querySelector<HTMLCanvasElement>('#zr-network-canvas');
    const ctxCandidate = canvasCandidate?.getContext('2d');
    if (!rootCandidate || !readerCandidate || !stageCandidate || !canvasCandidate || !ctxCandidate) return;
    const root = rootCandidate;
    const reader = readerCandidate;
    const stage = stageCandidate;
    const canvas = canvasCandidate;
    const ctx = ctxCandidate;
    const t = (en: string, zh: string) => window.SITE_SHELL?.lang === 'zh' ? zh : en;
    const format = (value: number) => value.toLocaleString('en-US');
    const numberInput = required(document.querySelector<HTMLInputElement>('#zr-node-number'), "'#zr-node-number'");
    const anchorSelect = required(document.querySelector<HTMLSelectElement>('#zr-network-anchor'), "'#zr-network-anchor'");
    const caches = new Map<string, Promise<Network>>();
    let network: Network | null = null;
    let incoming: Set<number>[] = [], outgoing: Set<number>[] = [], reciprocal: number[] = [];
    let zoom = 1, pan = {x: 0, y: 0}, request = 0, cohort = '', lastView = '', lastNode = '';
    let drag: {x: number; y: number; moved: boolean; panX: number; panY: number; mouse: boolean} | null = null;
    const selected = () => Number(root.dataset.graphNode || 0) - 1;
    const mode = () => root.dataset.graphView || 'mutual';
    const nameAt = (id: number) => { const data = network; return data && Object.keys(data.anchors).find(name=>data.anchors[name]===id+1); };
    function change(detail: {node: string}) {
        // Inspecting a user opens all of their real incoming/outgoing links.
        root.dispatchEvent(new CustomEvent('zrnetworkchange', {detail: {...detail, ...(detail.node ? {person:nameAt(Number(detail.node)-1)||''} : {}), ...(detail.node && mode()!=='all' ? {view:'all'} : {})}}));
    }
    function bringGraph() {
        canvas.focus({preventScroll:true});
        stage.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    }
    const renderer=createNetworkRenderer(ctx,stage,canvas,{network:()=>network,view:()=>({zoom,pan}),index:()=>({incoming,outgoing,reciprocal}),mode,selected,t,format,nameAt});
    const {draw, point}=renderer;
    function updateInspector() {
        if (!network) return;
        const current=selected(), focus=current>=0&&current<network.node_count&&mode()!=='groups';
        const title=required(document.getElementById('zr-node-title'), "'zr-node-title'"),description=required(document.getElementById('zr-node-description'), "'zr-node-description'"),stats=required(document.getElementById('zr-node-stats'), "'zr-node-stats'");
        title.textContent=focus?(nameAt(current)||t('User #','节点 #')+String(current+1).padStart(3,'0')):mode()==='groups'?t('Connections between groups','分组怎样相连？'):t('Who connects to whom?','谁和谁相连？');
        description.textContent=focus?t('All incoming and outgoing connections of this user, inside the selected network.','这个节点在所选网络内的全部关注与被关注连接。'):mode()==='groups'?t('Each circle gathers a structural group. Circle area represents users; lines count following links in both directions. Internal links stay inside the circles.','每个圆汇总一个结构分组。圆的面积表示人数；连线数字为两个方向的关注总数。组内连接未画在组间。'):t('Each dot is a user. Start with a published name or a number to explore their neighbours.','每个点是一名用户。从原文人物或编号出发，查看他的连接。');
        const values=focus?[[t('Followed by','被关注'),network.nodes[current][3]],[t('Following','关注'),network.nodes[current][4]],[t('Mutual neighbours','互相关注'),[...incoming[current]].filter(i=>outgoing[current].has(i)).length]]:[[t('Users','用户'),network.node_count],[t('Following links','关注连接'),network.edge_count],[t('Mutual pairs','互相关注对'),network.reciprocal_pairs]];
        stats.replaceChildren(...values.map(([label,value])=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=String(label);dd.textContent=format(Number(value));row.append(dt,dd);return row;}));
        const key=required(document.getElementById('zr-network-key'), "'zr-network-key'");
        const entries=focus?[['#71c9de',t('Follows this user','关注这个节点')],['#f39178',t('Followed by this user','这个节点关注')],['#e6cc78',t('Follows both ways','双方互相关注')]]:network.groups.map((g,i)=>[g.color,t('Group ','分组 ')+(i+1)+' · '+format(g.size)]);
        key.replaceChildren(...entries.map(([color,label])=>{const row=document.createElement('span'),dot=document.createElement('i');dot.style.backgroundColor=color;row.append(dot,document.createTextNode(label));return row;}));
        numberInput.max=String(network.node_count);numberInput.placeholder='1–'+network.node_count;numberInput.value=focus?String(current+1):'';
        const placeholder=document.createElement('option');placeholder.value='';placeholder.disabled=true;placeholder.textContent=t('Choose a published name…','选择原文人物…');
        anchorSelect.replaceChildren(placeholder,...Object.keys(network.anchors).map(name=>{const option=document.createElement('option');option.value=name;option.textContent=name;return option;}));anchorSelect.value=focus?nameAt(current)||'':'';
        const person=document.querySelector<HTMLSelectElement>('#zr-person')?.value;
        const openPerson=required(document.querySelector<HTMLButtonElement>('[data-open-network-person]'), "'[data-open-network-person]'");
        openPerson.hidden=!person||!network.anchors[person];openPerson.textContent=t('Explore '+person+' in the network','查看'+person+'的关注网络')+' ↗';
        required(document.getElementById('zr-graph-count'), "'zr-graph-count'").textContent=network.cohort+' · '+format(network.node_count)+t(' users · ',' 名用户 · ')+format(network.edge_count)+t(' directed links',' 条有向连接');
        required(document.getElementById('zr-graph-hint'), "'zr-graph-hint'").textContent=focus?t('Complete neighbourhood · arrowheads show direction','完整邻居 · 箭头表示方向'):mode()==='groups'?t('Circle = group · line = between-group links','圆 = 分组 · 线 = 组间连接'):t('Tap a dot to follow its connections','点一个节点，沿连接看进去');
        const count=mode()==='mutual'?network.reciprocal_pairs:network.edge_count;
        const stride=Math.max(1,Math.ceil(count/12000)),drawn=Math.ceil(count/stride);
        required(document.getElementById('zr-network-status'), "'zr-network-status'").textContent=mode()==='groups'?t('Groups are computed, not named social communities.','分组由算法计算，不是已命名的真实社群。'):focus?t('Complete neighbourhood; overview ink is subdued.','完整显示邻居，背景概览已淡化。'):t('Overview: ','概览绘制 ')+format(drawn)+t(' real links/pairs. Select a dot for every connection.',' 条真实连线。选中节点后显示全部连接。');
        const valuesDisclosure=required(root.querySelector<HTMLElement>('[data-group-values]'), "'[data-group-values]'");
        valuesDisclosure.hidden=mode()!=='groups';
        if(mode()==='groups'){
            const table=document.createElement('table'),caption=document.createElement('caption');
            caption.textContent=t('Row follows column. Diagonal cells count internal links.','行关注列。对角线为组内连接。');table.append(caption);
            const head=document.createElement('tr');
            [t('From / to','从 / 到'),...network.groups.map((_,i)=>t('Group ','组 ')+(i+1))].forEach(label=>{const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th);});
            const thead=document.createElement('thead');thead.append(head);table.append(thead);
            const tbody=document.createElement('tbody');network.group_links.forEach((values,i)=>{const row=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=t('Group ','组 ')+(i+1);row.append(th);values.forEach(value=>{const cell=document.createElement('td');cell.textContent=format(value);row.append(cell);});tbody.append(row);});table.append(tbody);
            required(document.getElementById('zr-group-table'), "'zr-group-table'").replaceChildren(table);
        }
    }
    async function update() {
        const next=root.dataset.graphCohort||'Net50k';
        if(mode()!==lastView){zoom=1;pan={x:0,y:0};lastView=mode();}
        if(root.dataset.graphNode!==lastNode){lastNode=root.dataset.graphNode || "";if(zoom>1&&network)scale(1);}
        if(next===cohort&&network){updateInspector();draw();return;}
        const token=++request;cohort=next;network=null;zoom=1;pan={x:0,y:0};reader.classList.remove('zr-network-loaded');
        reader.querySelectorAll<HTMLElement>('[data-graph-fallback]').forEach(el=>el.hidden=el.dataset.graphFallback!==next);
        required(document.getElementById('zr-node-stats'), "'zr-node-stats'").replaceChildren();
        required(document.getElementById('zr-node-title'), "'zr-node-title'").textContent=t('Archived network','归档网络');
        required(document.getElementById('zr-node-description'), "'zr-node-description'").textContent=t('Reading interactive data; the static overview remains visible.','交互数据读取中，静态概览仍可阅读。');
        required(document.getElementById('zr-network-key'), "'zr-network-key'").replaceChildren();
        required(document.querySelector<HTMLElement>('[data-open-network-person]'), "'[data-open-network-person]'").hidden=true;
        required(document.getElementById('zr-network-status'), "'zr-network-status'").textContent=t('Loading the archived network…','正在读取归档网络…');
        if(!caches.has(next))caches.set(next,fetch(`assets/zhihu-${next.toLowerCase()}.json?v=20261001b`).then(async response=>{
            if(!response.ok)throw new Error('Network unavailable');
            const data=parseNetwork(await response.json(), next);
            if(data.cohort!==next||data.nodes.length!==data.node_count||data.edges.length!==data.edge_count*2)throw new Error('Invalid network');
            return data;
        }));
        try{
            const data=await required(caches.get(next), "network request");if(token!==request)return;network=data;
            ({incoming, outgoing, reciprocal}=indexNetwork(data));
            reader.classList.add('zr-network-loaded');updateInspector();draw();
        }catch(_){if(token!==request)return;caches.delete(next);required(document.getElementById('zr-node-description'), "'zr-node-description'").textContent=t('Read the static overview, or switch to the other network.','可阅读静态图，或切换另一张网络。');required(document.getElementById('zr-network-status'), "'zr-network-status'").textContent=t('Interactive data unavailable. The real static network remains visible.','交互数据暂时不可用，仍可阅读真实网络的静态图。');}
    }
    function scale(delta: number){zoom=Math.max(1,Math.min(4,zoom*delta));const current=selected();if(zoom===1){pan={x:0,y:0};}else if(current>=0&&network){const n=network.nodes[current],size=Math.min(renderer.width,renderer.height)*.94;pan={x:-(n[0]-.5)*size*zoom,y:-(n[1]-.5)*size*zoom};}draw();}
    document.getElementById('zr-node-form')?.addEventListener('submit',event=>{event.preventDefault();if(!network||!numberInput.reportValidity())return;const value=Number(numberInput.value);if(Number.isInteger(value)&&value>=1&&value<=network.node_count){change({node:String(value)});bringGraph();}});
    anchorSelect?.addEventListener('change',()=>{const id=network?.anchors[anchorSelect.value];if(id){change({node:String(id)});bringGraph();}});
    document.querySelector('[data-open-network-person]')?.addEventListener('click',()=>{const person=document.querySelector<HTMLSelectElement>('#zr-person')?.value;const id=network?.anchors[person || ""];if(id){change({node:String(id)});bringGraph();}});
    root.querySelector('[data-clear-node]')?.addEventListener('click',()=>{zoom=1;pan={x:0,y:0};change({node:''});bringGraph();});
    root.querySelectorAll<HTMLButtonElement>('[data-graph-tool]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.graphTool==='reset'){zoom=1;pan={x:0,y:0};draw();}else scale(button.dataset.graphTool==='in'?1.4:1/1.4);}));
    canvas.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY,moved:false,panX:pan.x,panY:pan.y,mouse:event.pointerType==='mouse'};if(drag.mouse&&zoom>1)canvas.setPointerCapture(event.pointerId);});
    canvas.addEventListener('pointermove',event=>{if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag.moved||=Math.hypot(dx,dy)>6;if(drag.mouse&&zoom>1){pan={x:drag.panX+dx,y:drag.panY+dy};draw();}});
    canvas.addEventListener('pointerup',event=>{const was=drag;drag=null;if(!was||was.moved||!network||mode()==='groups')return;const box=canvas.getBoundingClientRect(),x=event.clientX-box.left,y=event.clientY-box.top;let nearest=-1,distance=22;network.nodes.forEach((node,i)=>{const p=point(node),d=Math.hypot(p.x-x,p.y-y);if(d<distance){nearest=i;distance=d;}});if(nearest>=0)change({node:String(nearest+1)});});
    canvas.addEventListener('pointercancel',()=>drag=null);canvas.addEventListener('lostpointercapture',()=>drag=null);
    canvas.addEventListener('keydown',event=>{if(!network)return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const step=event.key==='ArrowRight'?1:-1,current=selected();const next=current<0?(step>0?0:network.node_count-1):(current+step+network.node_count)%network.node_count;change({node:String(next+1)});}else if(event.key==='+'||event.key==='='){event.preventDefault();scale(1.4);}else if(event.key==='-'){event.preventDefault();scale(1/1.4);}else if(event.key==='Escape'){event.preventDefault();zoom=1;pan={x:0,y:0};change({node:''});}});
    root.addEventListener('zrstate',()=>void update());new ResizeObserver(()=>draw()).observe(stage);
    // The article and its real static overview are useful before this heavier
    // interactive graph is near the reader. Explicit controls still update above.
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            observer.disconnect();
            void update();
        }, { rootMargin: '200px 0px' });
        observer.observe(reader);
    } else void update();
})();
