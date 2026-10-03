(function () {
    interface OpenAnswer { title:string; aliases:string[] }
    interface Song { id:string; title:string; aliases:string[]; next:string[]; clue:{en:string;zh:string}; hint:{en:string;zh:string}; dead_ends?:string[]; open_answers?:OpenAnswer[]; terminal?:"dead-end"|"epilogue"; quote?:string; clue_format?:'prose'|'quote'; presentation:{flower:string;chord:{midi:number[]}} }
    interface Riddle { id:string; start:string; ending:string; bonus?:string; nodes:Song[] }
    interface Trail { current:string; found:string[]; edges:string[]; history:string[] }
    const root=document.querySelector<HTMLElement>('[data-echo-game]');
    const payload=document.getElementById('echo-data');
    if(!root||!payload)return;
    const data:Riddle=JSON.parse(payload.textContent), songs=new Map(data.nodes.map(n=>[n.id,n]));
    const flowers=['poppy','blue','ivory','dahlia'];
    const flowerFamily=(song:Song)=>flowers.indexOf(song.presentation.flower);
    const key='simoncos-'+data.id+'-v1';
    const t=(en:string,zh:string)=>window.SITE_SHELL?.lang==='zh'?zh:en;
    const norm=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[\s《》「」『』·.,，。!?！？’'"-]/g,'');
    const fresh=():Trail=>({current:data.start,found:[data.start],edges:[],history:[]});
    let trail=fresh(), storage=true, zoomed=window.matchMedia('(max-width: 650px)').matches;
    try {
        const saved=JSON.parse(localStorage.getItem(key)||'null');
        if(saved&&typeof saved==='object'&&Array.isArray(saved.found)&&Array.isArray(saved.edges)&&Array.isArray(saved.history)) {
            // Node discoveries survive author revisions to the routes. New songs stay undiscovered.
            const validEdges=saved.edges.filter((e:unknown)=>typeof e==='string'&&data.nodes.some(n=>n.next.some(id=>e===n.id+':'+id)));
            trail.found=[data.start,...saved.found.filter((id:unknown)=>typeof id==='string'&&id!==data.start&&id!==data.bonus&&songs.has(id))];
            trail.found=[...new Set(trail.found)];
            trail.edges=validEdges.filter((e:string)=>e.split(':').every(id=>trail.found.includes(id)));
            syncBonus();
            trail.current=trail.found.includes(saved.current)?saved.current:data.start;
            trail.history=saved.history.filter((id:unknown)=>typeof id==='string'&&trail.found.includes(id)).slice(-100);
        }
    }catch{try{localStorage.removeItem(key);}catch{storage=false;}}
    const input=document.querySelector<HTMLInputElement>('#echo-answer');
    input.setAttribute('aria-describedby','echo-feedback');
    const feedback=document.getElementById('echo-feedback');
    const form=document.getElementById('echo-form');
    const hint=document.getElementById('echo-hint') as HTMLDetailsElement;
    const reveal=document.getElementById('echo-reveal') as HTMLDetailsElement;
    const compact=window.matchMedia('(max-width: 900px)');
    const cluePanel=root.querySelector<HTMLElement>('.echo-clue-panel');
    const mapPanel=root.querySelector<HTMLElement>('.echo-map-panel');
    const clueDialog=document.getElementById('echo-clue-dialog') as HTMLDialogElement;
    const currentButton=root.querySelector<HTMLButtonElement>('[data-open-clue]');
    let clueOpener:Element|null=null;
    let clueFromList=false;
    function openClue(opener:Element|null=document.activeElement){
        if(!compact.matches)return;
        if(!clueDialog.open){
            clueOpener=opener;
            clueFromList=!!opener?.closest('#echo-song-list');
            clueDialog.showModal();
            document.documentElement.classList.add('echo-sheet-open');
        }
        clueDialog.scrollTop=0;
        document.getElementById('echo-song').focus({preventScroll:true});
    }
    function closeClue(){if(clueDialog.open)clueDialog.close();}
    clueDialog.addEventListener('close',()=>{
        document.documentElement.classList.remove('echo-sheet-open');
        const target=clueFromList?document.querySelector('#echo-song-list [aria-current=true]'):clueOpener?.isConnected?clueOpener:currentButton;
        if(compact.matches&&(target instanceof HTMLElement||target instanceof SVGElement))target.focus({preventScroll:true});
    });
    root.querySelector('[data-close-clue]').addEventListener('click',closeClue);
    currentButton.addEventListener('click',()=>openClue());
    clueDialog.addEventListener('click',event=>{if(event.target===clueDialog){
        const box=clueDialog.getBoundingClientRect();
        if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeClue();
    }});
    function syncClueLayout(){
        if(compact.matches)clueDialog.append(cluePanel);
        else{closeClue();mapPanel.before(cluePanel);}
    }
    compact.addEventListener('change',()=>{syncClueLayout();centerCurrentFlower();});
    // Keep the sheet and its close control above the on-screen keyboard.
    function syncKeyboardViewport(){
        const viewport=window.visualViewport;
        clueDialog.style.setProperty('--echo-viewport-height',(viewport?.height||window.innerHeight)+'px');
        clueDialog.style.setProperty('--echo-sheet-bottom',Math.max(0,window.innerHeight-(viewport?.height||window.innerHeight)-(viewport?.offsetTop||0))+'px');
    }
    window.visualViewport?.addEventListener('resize',syncKeyboardViewport);
    window.visualViewport?.addEventListener('scroll',syncKeyboardViewport);
    syncClueLayout();syncKeyboardViewport();
    let notice:()=>string=()=>'';
    let feedbackKind='';
    const soundKey=key+'-sound';
    let soundEnabled=true,soundStatus:EchoPiano.Status='ready';
    try{soundEnabled=localStorage.getItem(soundKey)!=='off';}catch{}
    const piano=new EchoPiano.Player(status=>{soundStatus=status;renderSound();});
    function renderSound(){
        const button=root.querySelector<HTMLButtonElement>('[data-sound]');
        button.disabled=soundStatus==='unavailable';
        button.setAttribute('aria-pressed',String(soundEnabled&&soundStatus!=='unavailable'&&soundStatus!=='failed'));
        button.setAttribute('aria-busy',String(soundStatus==='loading'));
        root.querySelector('[data-sound-label]').textContent=soundStatus==='unavailable'?t('Sound unavailable','音效不可用'):!soundEnabled?t('Sound off','音效：关'):soundStatus==='loading'?t('Loading piano…','加载钢琴…'):soundStatus==='failed'?t('Retry sound','重试音效'):t('Sound on','音效：开');
        button.title=t('A piano chord when you discover or select a song','发现或点击已点亮的歌曲时，播放钢琴和弦');
    }
    function playChord(id:string){
        if(!soundEnabled)return;
        const song=songs.get(id);
        if(song)void piano.play(song.presentation.chord.midi);
    }
    function focusClue(opener?:Element){
        if(compact.matches){openClue(opener);return;}
        document.getElementById('echo-song').focus({preventScroll:true});
    }
    function centerCurrentFlower(){
        if(!zoomed)return;
        const stage=root.querySelector<HTMLElement>('.echo-map-stage');
        const current=root.querySelector<SVGElement>('.echo-node.is-current .echo-hit').getBoundingClientRect(),box=stage.getBoundingClientRect();
        const visibleTop=Math.max(box.top,0);
        const visibleBottom=compact.matches?Math.min(box.bottom,window.innerHeight,root.querySelector('.echo-current').getBoundingClientRect().top):box.bottom;
        const centerY=visibleBottom-visibleTop>100?(visibleTop+visibleBottom)/2:box.top+stage.clientHeight/2;
        stage.scrollLeft+=current.left+current.width/2-box.left-stage.clientWidth/2;
        stage.scrollTop+=current.top+current.height/2-centerY;
    }
    function syncBonus(){
        if(!data.bonus)return false;
        const complete=data.nodes.filter(n=>n.id!==data.bonus).every(n=>trail.found.includes(n.id));
        if(complete&&!trail.found.includes(data.bonus)){trail.found.push(data.bonus);return true;}
        return false;
    }
    function save(){try{localStorage.setItem(key,JSON.stringify(trail));}catch{storage=false;}}
    let arrivalTimer:number;
    function clearArrival(){
        window.clearTimeout(arrivalTimer);root.classList.remove('is-loop-arrival','is-ending-arrival','is-song-arrival');
        root.querySelectorAll('.is-new').forEach(node=>node.classList.remove('is-new'));
        root.querySelector('[data-travel-glow]').removeAttribute('d');
    }
    function animateArrival(kind:'loop'|'ending'|'song',previous:string,id:string,isNew:boolean,bonus:boolean){
        if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
        const path=Array.from(root.querySelectorAll<SVGPathElement>('[data-from]')).find(edge=>edge.dataset.from===previous&&edge.dataset.to===id);
        if(path)root.querySelector('[data-travel-glow]').setAttribute('d',path.getAttribute('d'));
        root.querySelectorAll<SVGGElement>('[data-node]').forEach(node=>{
            if((isNew&&node.dataset.node===id)||(bonus&&node.dataset.node===data.bonus))node.classList.add('is-new');
        });
        // Restart the path sweep even when consecutive answers use the same arrival style.
        void root.offsetWidth;
        root.classList.add('is-'+kind+'-arrival');
        arrivalTimer=window.setTimeout(clearArrival,2800);
    }
    function visit(id:string,remember=true,center=true){
        if(!trail.found.includes(id))return;
        playChord(id);
        clearArrival();
        if(remember&&trail.current!==id)trail.history.push(trail.current);
        trail.history=trail.history.slice(-100);trail.current=id;input.value='';notice=()=>'';feedbackKind='';hint.open=false;reveal.open=false;save();render();if(center)centerCurrentFlower();
    }
    function solve(id:string){
        const previous=songs.get(trail.current);
        if(!previous.next.includes(id))return;
        const edge=previous.id+':'+id;
        if(!trail.edges.includes(edge))trail.edges.push(edge);
        const isNew=!trail.found.includes(id);
        if(isNew)trail.found.push(id);
        const unlocked=syncBonus();
        visit(id);
        const arrival=id===data.ending?'ending':id===data.start&&previous.id!==data.start?'loop':null;
        notice=()=>unlocked?t('Every song is lit. A hidden echo has appeared beside the ending.','所有歌曲都已点亮。终点旁出现了一段隐藏的回响。'):arrival==='loop'?t('Back to the beginning. Your trail remains.','又回到最初。走过的路还在。'):t('Found: ','找到了：')+songs.get(id).title+(id===data.ending?t(' · The ending.',' · 终点。'):'');
        feedbackKind='success';render();animateArrival(arrival||'song',previous.id,id,isNew,unlocked);focusClue();
    }
    function acknowledgeOpen(answer:OpenAnswer){
        notice=()=>t(`You found ${answer.title}. Its next clue is still blank; explore another branch for now.`,
            `接上了《${answer.title}》。后续谜面暂空，可以先探索其他分支。`);
        input.value='';feedbackKind='success';render();
    }
    function render(){
        const song=songs.get(trail.current),ending=song.id===data.ending,deadEnd=song.terminal==='dead-end',epilogue=song.id===data.bonus;
        const heading=document.getElementById('echo-song');heading.textContent=song.title;heading.tabIndex=-1;
        const songIndex=data.nodes.findIndex(n=>n.id===song.id);
        const family=flowerFamily(song);
        const emblem=root.querySelector<HTMLElement>('[data-clue-flower]');emblem.className='echo-clue-flower bloom-'+family;
        root.querySelector<HTMLImageElement>('[data-clue-art]').src='assets/echo-flower-'+song.presentation.flower+'.webp';
        root.querySelector('[data-song-number]').textContent=epilogue?'✧':String(songIndex+1).padStart(2,'0');
        const quote=document.getElementById('echo-quote');
        const quotedClue=song.clue_format==='quote';
        const quoteText=quotedClue?t(song.clue.en,song.clue.zh):song.quote;
        // Chinese lyric phrases get deliberate line breaks; translations wrap naturally.
        quote.replaceChildren(...(quoteText?.match(/[^，]+，?/g)||[]).map(line=>{const span=document.createElement('span');span.textContent=line;return span;}));quote.hidden=!quoteText;
        quote.lang=quotedClue?t('en','zh-Hans'):'zh-Hans';
        const clue=document.getElementById('echo-clue');
        clue.textContent=t(song.clue.en,song.clue.zh);clue.hidden=quotedClue;
        root.querySelector('[data-current-title]').textContent=song.title;
        root.querySelector('[data-current-preview]').textContent=song.quote||t(song.clue.en,song.clue.zh);
        const remaining=song.next.filter(id=>!trail.edges.includes(song.id+':'+id)).length;
        const total=song.next.length, explored=total-remaining;
        let branch=epilogue?t('A HIDDEN ECHO · THANK YOU FOR LISTENING','隐藏回响 · 谢谢你听到这里'):deadEnd?t('DEAD END · EXPLORE ANOTHER BRANCH','死胡同 · 换一条路继续'):ending?t('ENDING FOUND','已抵达终点'):total?
            (remaining?t(`${total} outgoing ${total===1?'path':'paths'} · ${explored} explored`,`下一步 ${total} 条 · 已走通 ${explored} 条`):t(`${total} outgoing ${total===1?'path':'paths'} · all explored`,`下一步 ${total} 条 · 已全部走通`)):
            t('Guess this side branch, then return to another song.','猜猜这条支线，再回到其他歌继续。');
        if(song.open_answers?.length)branch+='\n'+t(`${song.open_answers.length} answer has no next clue yet`,`另有 ${song.open_answers.length} 个答案，后续暂空`);
        document.getElementById('echo-branch').textContent=branch;
        form.hidden=ending||deadEnd||epilogue;document.getElementById('echo-dead-end').hidden=!(deadEnd||epilogue);document.getElementById('echo-ending').hidden=!ending;
        document.querySelector<HTMLElement>('.echo-help').hidden=ending||deadEnd||epilogue;
        document.querySelector<HTMLButtonElement>('[data-back]').disabled=!trail.history.length;
        feedback.textContent=notice();feedback.dataset.kind=feedbackKind;
        input.setAttribute('aria-invalid',String(feedbackKind==='error'));
        renderSound();
        document.getElementById('echo-hint-text').textContent=t(song.hint.en,song.hint.zh);
        const choices=document.getElementById('echo-reveal-choices');choices.replaceChildren();
        if(reveal.open) {
            if(song.next.length)for(const id of song.next){const button=document.createElement('button');button.type='button';button.textContent=songs.get(id).title+' →';button.addEventListener('click',()=>solve(id));choices.append(button);}
            else if(song.dead_ends?.length){const p=document.createElement('p');p.textContent=t('This side branch has no further clue here: ','这条支线在这里没有后续谜面：')+song.dead_ends[0];choices.append(p);}
            for(const answer of song.open_answers||[]){const button=document.createElement('button');button.type='button';button.textContent=answer.title+t(' · next clue pending',' · 后续待补');button.addEventListener('click',()=>acknowledgeOpen(answer));choices.append(button);}
        }
        const list=document.getElementById('echo-song-list');list.replaceChildren(...trail.found.map(id=>{
            const button=document.createElement('button');button.type='button';button.textContent=songs.get(id).title;button.setAttribute('aria-current',String(id===song.id));button.className='bloom-'+flowerFamily(songs.get(id));button.addEventListener('click',()=>{visit(id);focusClue(list.querySelector('[aria-current=true]'));});return button;
        }));
        const foundCount=trail.found.filter(id=>id!==data.bonus).length;
        document.getElementById('echo-found-count').textContent=String(foundCount);
        (document.getElementById('echo-progress-bar') as HTMLProgressElement).value=foundCount;
        const bonusUnlocked=!!data.bonus&&trail.found.includes(data.bonus);
        document.getElementById('echo-bonus').hidden=!bonusUnlocked;
        root.querySelector<SVGElement>('[data-bonus-link]')?.classList.toggle('is-hidden',!bonusUnlocked);
        root.classList.toggle('is-map-zoomed',zoomed);
        const zoomButton=root.querySelector<HTMLButtonElement>('[data-map-zoom]');
        zoomButton.textContent=zoomed?t('See full map','查看全图'):t('Enlarge map','放大地图');zoomButton.setAttribute('aria-pressed',String(zoomed));
        root.querySelector('.echo-map-instruction').textContent=zoomed?t('Scroll to explore · tap a lit song to select and replay','滑动查看 · 点已点亮的歌曲，切换并回放'):t('Tap a lit song to select and replay','点已点亮的歌曲，切换并回放');
        document.getElementById('echo-save-status').textContent=storage?t('Saved in this browser','进度已保存在此浏览器'):t('Saving unavailable · progress lasts while this page is open','无法保存 · 进度仅在此页面打开时保留');
        root.querySelectorAll<SVGGElement>('[data-node]').forEach(node=>{
            const id=node.dataset.node,found=trail.found.includes(id),active=id===song.id;
            node.classList.toggle('is-hidden',id===data.bonus&&!bonusUnlocked);
            node.setAttribute('aria-hidden',String(id===data.bonus&&!bonusUnlocked));
            const kind=node.querySelector('.echo-node-kind');
            if(kind)kind.textContent=id===data.start?t('START','起点'):t('ENDING','终点');
            node.classList.toggle('is-found',found);node.classList.toggle('is-current',active);
            node.querySelector('text').textContent=found?songs.get(id).title:String(data.nodes.findIndex(n=>n.id===id)+1).padStart(2,'0');
            if(found){node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label',t('Revisit ','重新打开')+songs.get(id).title);node.setAttribute('aria-pressed',String(active));}
            else{node.removeAttribute('role');node.removeAttribute('tabindex');node.removeAttribute('aria-label');node.removeAttribute('aria-pressed');}
        });
        const relatedRoutes:SVGGElement[]=[];
        root.querySelectorAll<SVGPathElement>('[data-from]').forEach(edge=>{
            const found=trail.edges.includes(edge.dataset.from+':'+edge.dataset.to);
            const outgoing=edge.dataset.from===song.id;
            edge.classList.toggle('is-found',found);
            edge.classList.toggle('is-current',found&&outgoing);
            edge.classList.toggle('is-next',!found&&outgoing);
            edge.classList.toggle('is-incoming',edge.dataset.to===song.id);
            edge.setAttribute('marker-end',outgoing?'url(#echo-arrow-active)':'url(#echo-arrow)');
            const route=edge.parentElement as unknown as SVGGElement;
            const related=outgoing||edge.dataset.to===song.id;
            route.classList.toggle('is-related',related);
            if(related)relatedRoutes.push(route);
        });
        const glow=root.querySelector('[data-travel-glow]');
        // Related paths sit above crossings, while labels and nodes stay above every path.
        relatedRoutes.sort((a,b)=>Number(a.querySelector<SVGPathElement>('[data-from]').dataset.from===song.id)-Number(b.querySelector<SVGPathElement>('[data-from]').dataset.from===song.id));
        for(const route of relatedRoutes)glow.before(route);
    }
    document.getElementById('echo-form').addEventListener('submit',event=>{
        event.preventDefault();const guess=norm(input.value),song=songs.get(trail.current);
        if(!guess)return;
        const answer=song.next.find(id=>[songs.get(id).title,...songs.get(id).aliases].some(answer=>norm(answer)===guess));
        if(answer){solve(answer);return;}
        const openAnswer=song.open_answers?.find(answer=>[answer.title,...answer.aliases].some(value=>norm(value)===guess));
        if(openAnswer){acknowledgeOpen(openAnswer);return;}
        if(song.dead_ends?.some(n=>norm(n)===guess))notice=()=>t('You found a side branch with no next clue here; revisit another song below.','你接上了一条支线。这里没有下一条谜面，可以在下方回到其他歌。');
        else notice=()=>t('That song doesn’t follow this clue. Try another, or open a hint.','这首歌没有接上当前线索。可以再试一首，或打开提示。');
        feedbackKind='error';render();input.select();
    });
    document.querySelector('[data-back]').addEventListener('click',()=>{const id=trail.history.pop();if(id)visit(id,false);});
    document.querySelector('[data-open-bonus]').addEventListener('click',()=>{if(data.bonus){visit(data.bonus);focusClue();}});
    document.querySelector('[data-return-branch]').addEventListener('click',()=>{const id=trail.history.pop()||data.nodes.find(n=>n.next.includes(trail.current))?.id||data.start;visit(id,false);});
    document.querySelector('[data-go-start]').addEventListener('click',()=>visit(data.start));
    document.querySelector('[data-reset]').addEventListener('click',()=>{clearArrival();piano.stop();trail=fresh();notice=()=>'';feedbackKind='';hint.open=false;reveal.open=false;input.value='';document.querySelector<HTMLDetailsElement>('.echo-reset').open=false;save();render();});
    hint.addEventListener('toggle',()=>{if(hint.open)reveal.open=false;});
    reveal.addEventListener('toggle',()=>{if(reveal.open)hint.open=false;render();});
    root.querySelector('[data-sound]').addEventListener('click',()=>{
        soundEnabled=soundStatus==='failed'?true:!soundEnabled;
        if(soundEnabled)playChord(trail.current);else piano.stop();
        try{localStorage.setItem(soundKey,soundEnabled?'on':'off');}catch{}
        renderSound();
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden)piano.stop();});
    root.querySelector('[data-map-zoom]').addEventListener('click',()=>{
        zoomed=!zoomed;render();centerCurrentFlower();
    });
    root.querySelector('[data-map-locate]').addEventListener('click',()=>{zoomed=true;render();centerCurrentFlower();});
    root.querySelectorAll<SVGGElement>('[data-node]').forEach(node=>{
        // Selecting a map node never moves the page, the panned map or keyboard focus.
        node.addEventListener('click',()=>visit(node.dataset.node,true,false));
        node.addEventListener('keydown',event=>{if(!event.repeat&&(event.key==='Enter'||event.key===' ')){event.preventDefault();visit(node.dataset.node,true,false);}});
    });
    window.SITE_SHELL?.onLang?.(render);
    syncBonus();save();render();centerCurrentFlower();
})();
