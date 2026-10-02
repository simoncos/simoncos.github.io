(function () {
    interface Song { id:string; title:string; aliases:string[]; next:string[]; clue:{en:string;zh:string}; hint:{en:string;zh:string}; dead_ends?:string[] }
    interface Riddle { id:string; start:string; ending:string; nodes:Song[] }
    interface Trail { current:string; found:string[]; edges:string[]; history:string[] }
    const root=document.querySelector<HTMLElement>('[data-echo-game]');
    const payload=document.getElementById('echo-data');
    if(!root||!payload)return;
    const data:Riddle=JSON.parse(payload.textContent), songs=new Map(data.nodes.map(n=>[n.id,n]));
    const key='simoncos-'+data.id+'-v1';
    const t=(en:string,zh:string)=>window.SITE_SHELL?.lang==='zh'?zh:en;
    const norm=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[\s《》「」『』·.,，。!?！？’'"-]/g,'');
    const fresh=():Trail=>({current:data.start,found:[data.start],edges:[],history:[]});
    let trail=fresh(), storage=true, zoomed=false;
    try {
        const saved=JSON.parse(localStorage.getItem(key)||'null');
        if(saved&&typeof saved==='object'&&Array.isArray(saved.found)&&Array.isArray(saved.edges)&&Array.isArray(saved.history)) {
            // Keep only reachable discoveries backed by saved, real edges.
            const validEdges=saved.edges.filter((e:unknown)=>typeof e==='string'&&data.nodes.some(n=>n.next.some(id=>e===n.id+':'+id)));
            const reachable=new Set([data.start]);
            for(let i=0;i<data.nodes.length;i++) for(const edge of validEdges){const [a,b]=edge.split(':');if(reachable.has(a))reachable.add(b);}
            trail.found=[data.start,...saved.found.filter((id:unknown)=>typeof id==='string'&&id!==data.start&&reachable.has(id))];
            trail.found=[...new Set(trail.found)];
            trail.edges=validEdges.filter((e:string)=>e.split(':').every(id=>trail.found.includes(id)));
            trail.current=trail.found.includes(saved.current)?saved.current:data.start;
            trail.history=saved.history.filter((id:unknown)=>typeof id==='string'&&trail.found.includes(id)).slice(-100);
        }
    }catch{try{localStorage.removeItem(key);}catch{storage=false;}}
    const input=document.querySelector<HTMLInputElement>('#echo-answer');
    const feedback=document.getElementById('echo-feedback');
    const form=document.getElementById('echo-form');
    const hint=document.getElementById('echo-hint') as HTMLDetailsElement;
    const reveal=document.getElementById('echo-reveal') as HTMLDetailsElement;
    let notice:()=>string=()=>'';
    function save(){try{localStorage.setItem(key,JSON.stringify(trail));}catch{storage=false;}}
    function visit(id:string,remember=true){
        if(!trail.found.includes(id))return;
        if(remember&&trail.current!==id)trail.history.push(trail.current);
        trail.history=trail.history.slice(-100);trail.current=id;input.value='';notice=()=>'';hint.open=false;reveal.open=false;save();render();
    }
    function solve(id:string){
        const previous=songs.get(trail.current);
        if(!previous.next.includes(id))return;
        const edge=previous.id+':'+id;
        if(!trail.edges.includes(edge))trail.edges.push(edge);
        if(!trail.found.includes(id))trail.found.push(id);
        visit(id);
        notice=()=>t('Found: ','找到了：')+songs.get(id).title+(id===data.ending?t(' · The ending.',' · 终点。'):'');
        render();document.getElementById('echo-song').focus({preventScroll:true});
    }
    function render(){
        const song=songs.get(trail.current),ending=song.id===data.ending;
        const heading=document.getElementById('echo-song');heading.textContent=song.title;heading.tabIndex=-1;
        document.getElementById('echo-clue').textContent=t(song.clue.en,song.clue.zh);
        const remaining=song.next.filter(id=>!trail.edges.includes(song.id+':'+id)).length;
        document.getElementById('echo-branch').textContent=ending?t('ENDING FOUND','已抵达终点'):song.next.length?t(`${remaining} of ${song.next.length} paths still to follow here`,`${song.next.length} 条路 · 还有 ${remaining} 条未走`):t('A detour. Guess the song, then return to another branch.','一条岔路。猜猜它指向的歌，再回头走其他分支。');
        form.hidden=ending;document.getElementById('echo-ending').hidden=!ending;
        document.querySelector<HTMLElement>('.echo-help').hidden=ending;
        document.querySelector<HTMLButtonElement>('[data-back]').disabled=!trail.history.length;
        feedback.textContent=notice();
        document.getElementById('echo-hint-text').textContent=t(song.hint.en,song.hint.zh);
        const choices=document.getElementById('echo-reveal-choices');choices.replaceChildren();
        if(reveal.open) {
            if(song.next.length)for(const id of song.next){const button=document.createElement('button');button.type='button';button.textContent=songs.get(id).title+' →';button.addEventListener('click',()=>solve(id));choices.append(button);}
            else {const p=document.createElement('p');p.textContent=t('This clue points to a dead end: ','这条线索指向一条死胡同：')+(song.dead_ends?.[0]||'');choices.append(p);}
        }
        const list=document.getElementById('echo-song-list');list.replaceChildren(...trail.found.map(id=>{
            const button=document.createElement('button');button.type='button';button.textContent=songs.get(id).title;button.setAttribute('aria-current',String(id===song.id));button.addEventListener('click',()=>visit(id));return button;
        }));
        document.getElementById('echo-found-count').textContent=String(trail.found.length);
        root.classList.toggle('is-map-zoomed',zoomed);
        const zoomButton=root.querySelector<HTMLButtonElement>('[data-map-zoom]');
        zoomButton.textContent=zoomed?t('Fit map','缩回全图'):t('Enlarge map','放大地图');zoomButton.setAttribute('aria-pressed',String(zoomed));
        document.getElementById('echo-save-status').textContent=storage?t('Saved in this browser','进度已保存在此浏览器'):t('Saving unavailable · progress lasts while this page is open','无法保存 · 进度仅在此页面打开时保留');
        root.querySelectorAll<SVGGElement>('[data-node]').forEach(node=>{
            const id=node.dataset.node,found=trail.found.includes(id),active=id===song.id;
            node.classList.toggle('is-found',found);node.classList.toggle('is-current',active);
            node.querySelector('text').textContent=found?songs.get(id).title:String(data.nodes.findIndex(n=>n.id===id)+1).padStart(2,'0');
            if(found){node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label',t('Revisit ','重新打开')+songs.get(id).title);node.setAttribute('aria-pressed',String(active));}
            else{node.removeAttribute('role');node.removeAttribute('tabindex');node.removeAttribute('aria-label');node.removeAttribute('aria-pressed');}
        });
        root.querySelectorAll<SVGPathElement>('[data-from]').forEach(edge=>{
            const found=trail.edges.includes(edge.dataset.from+':'+edge.dataset.to);
            edge.classList.toggle('is-found',found);edge.classList.toggle('is-current',found&&(edge.dataset.from===song.id||edge.dataset.to===song.id));
        });
    }
    document.getElementById('echo-form').addEventListener('submit',event=>{
        event.preventDefault();const guess=norm(input.value),song=songs.get(trail.current);
        if(!guess)return;
        const answer=song.next.find(id=>[songs.get(id).title,...songs.get(id).aliases].some(answer=>norm(answer)===guess));
        if(answer){solve(answer);return;}
        if(song.dead_ends?.some(n=>norm(n)===guess))notice=()=>t('You found an original dead end. There is no next clue here; revisit another song below.','你猜到了一条原版死胡同。这里没有下一条谜面，可以在下方回到其他歌。');
        else notice=()=>t('That song doesn’t follow this clue. Try another, or open a hint.','这首歌没有接上当前线索。可以再试一首，或打开提示。');
        render();input.select();
    });
    document.querySelector('[data-back]').addEventListener('click',()=>{const id=trail.history.pop();if(id)visit(id,false);});
    document.querySelector('[data-go-start]').addEventListener('click',()=>visit(data.start));
    document.querySelector('[data-reset]').addEventListener('click',()=>{trail=fresh();notice=()=>'';hint.open=false;reveal.open=false;input.value='';document.querySelector<HTMLDetailsElement>('.echo-reset').open=false;save();render();});
    reveal.addEventListener('toggle',render);
    root.querySelector('[data-map-zoom]').addEventListener('click',()=>{zoomed=!zoomed;render();});
    root.querySelectorAll<SVGGElement>('[data-node]').forEach(node=>{
        node.addEventListener('click',()=>visit(node.dataset.node));
        node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();visit(node.dataset.node);}});
    });
    window.SITE_SHELL?.onLang?.(render);
    save();render();
})();
