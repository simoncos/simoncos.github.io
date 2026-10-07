import {required} from "../lib/dom";
import type {Song, Riddle, Trail} from "./types";
export function createMapView(root: HTMLElement, neighborhood: SVGElement, data: Riddle, songAt: (id: string | undefined) => Song, getTrail: () => Trail, flowerFamily: (song: Song) => number, flowers: string[], t: (en: string, zh: string) => string) {
function renderNeighborhood(song:Song){
        const trail=getTrail();
        const ns='http://www.w3.org/2000/svg';
        const element=(tag:string,attrs:Record<string,string>,text?:string)=>{
            const node=document.createElementNS(ns,tag);
            for(const [name,value] of Object.entries(attrs))node.setAttribute(name,value);
            if(text!==undefined)node.textContent=text;
            return node;
        };
        neighborhood.replaceChildren();
        const defs=element('defs',{});
        for(const side of ['in','out']){
            const marker=element('marker',{id:'echo-local-arrow-'+side,viewBox:'0 0 10 10',refX:'9',refY:'5',markerWidth:'6',markerHeight:'6',orient:'auto',markerUnits:'userSpaceOnUse'});
            marker.append(element('path',{d:'M0 0 L10 5 L0 10 L2 5 Z',class:'echo-focus-arrow-'+side}));defs.append(marker);
        }
        neighborhood.append(defs);
        const incoming=data.nodes.filter(n=>trail.edges.includes(n.id+':'+song.id)).map(n=>n.id);
        if(song.id===data.bonus)incoming.push(data.ending);
        const outgoing=[...song.next];
        if(song.id===data.ending&&data.bonus&&trail.found.includes(data.bonus))outgoing.push(data.bonus);
        for(const [side,ids] of [['in',incoming],['out',outgoing]] as const){
            const x=side==='in'?42:318;
            if(ids.length)neighborhood.append(element('text',{x:String(x),y:String(Math.max(16,115-(ids.length-1)*32-50)),'text-anchor':'middle',class:'echo-focus-caption'},side==='in'?t('FROM','来路'):t('ONWARD','出路')));
            ids.forEach((id,i)=>{
                const next=songAt(id),found=trail.found.includes(id);
                const y=115+(i-(ids.length-1)/2)*64;
                const path=side==='in'?`M72 ${y} C105 ${y} 107 115 124 115`:`M236 115 C253 115 254 ${y} 286 ${y}`;
                neighborhood.append(element('path',{d:path,class:'echo-focus-edge echo-focus-edge-'+side+(!found?' is-pending':''),'marker-end':'url(#echo-local-arrow-'+side+')'}));
                const group=element('g',{'data-focus-node':id,'data-focus-side':side,class:'echo-focus-node bloom-'+flowerFamily(next)+(found?' is-found':''),transform:`translate(${x} ${y})`});
                group.append(element('circle',{r:'32',class:'echo-focus-hit'}));
                if(found){
                    group.setAttribute('role','button');group.setAttribute('tabindex','0');
                    group.setAttribute('aria-label',(side==='in'?t('Back to ','回到'):t('Continue to ','继续到'))+next.title);
                    group.append(element('image',{href:'assets/echo-flower-'+next.presentation.flower+'.webp',x:'-20',y:'-20',width:'40',height:'40'}));
                }else{
                    group.setAttribute('aria-label',t('Song still to discover','尚未接上的歌曲'));
                    group.append(element('circle',{r:'15',class:'echo-focus-unknown'}),element('text',{'text-anchor':'middle',y:'6',class:'echo-focus-question'},'?'));
                }
                const foreign=element('foreignObject',{x:'-42',y:'22',width:'84',height:'42'});
                const label=document.createElementNS('http://www.w3.org/1999/xhtml','span');
                label.className='echo-focus-label';label.textContent=found?next.title:t('Not found','未接上');
                foreign.append(label);group.append(foreign);neighborhood.append(group);
            });
        }
        if(!outgoing.length)neighborhood.append(element('text',{x:'318',y:'120','text-anchor':'middle',class:'echo-focus-caption'},song.id===data.ending?t('ENDING','终点'):t('END OF PATH','支线尽头')));
    }
function renderKeys(song:Song){
        const trail=getTrail();
        const keys=required(root.querySelector<HTMLElement>('[data-keys]'), "'[data-keys]'");
        const chord=new Set(song.presentation.chord.midi),heard=new Map<number,number>();
        for(const id of trail.found)if(id!==song.id)for(const note of songAt(id).presentation.chord.midi)heard.set(note,(heard.get(note)||0)+1);
        keys.classList.remove(...flowers.map((_,i)=>'bloom-'+i));keys.classList.add('bloom-'+flowerFamily(song));
        keys.querySelectorAll<HTMLElement>('[data-midi]').forEach(key=>{
            const note=Number(key.dataset.midi);
            key.classList.toggle('is-chord',chord.has(note));
            key.style.setProperty('--heat',String(Math.min(1,(heard.get(note)||0)/6).toFixed(2)));
        });
    }
    return {renderNeighborhood, renderKeys};
}
