/** The pure side of the score player: which chords a path or the finale plays, and when. No DOM and no audio, so Node can test it. */
namespace EchoScore {
    export interface FinaleStep { node:string; beats:number; level:number; roll?:number; release?:number; gate?:number }
    export interface Finale { beat:number; steps:readonly FinaleStep[] }

    /** Share of a chord's span that it sounds before its fade begins; the rest overlaps the next chord, like a sustain pedal. */
    export const legato=.92;
    /** Seconds per chord when a player's own path is played back, before the closing ritardando. */
    export const pulse=.7;

    /**
     * The way the player came from the start to `target`, over the paths they have actually walked ("from:to" strings, kept in
     * the order they were last walked). Traced back from the target, each song is entered by the path walked into it most
     * recently, so a song reached two ways replays the latest one (seen 2026-10-04: 喜帖街 then 花花世界 into 贝多芬 replayed
     * 喜帖街). No song repeats. The hidden coda has no path of its own: it follows the ending. Empty when no walked route exists.
     */
    export function route(edges:readonly string[],start:string,target:string,ending:string,bonus?:string):string[]{
        if(bonus&&target===bonus){
            const base=route(edges,start,ending,ending);
            return base.length?[...base,bonus]:[];
        }
        const onward=new Map<string,string[]>(),into=new Map<string,string[]>();
        for(let i=edges.length-1;i>=0;i--){
            const [from,to]=edges[i].split(':');
            if(!from||!to)continue;
            if(!onward.has(from))onward.set(from,[]);
            onward.get(from).push(to);
            if(!into.has(to))into.set(to,[]);
            into.get(to).push(from);
        }
        // Only songs the start reaches can lie on the way back, which keeps the search from wandering.
        const reached=new Set([start]),queue=[start];
        for(let i=0;i<queue.length;i++)for(const next of onward.get(queue[i])||[])if(!reached.has(next)){reached.add(next);queue.push(next);}
        if(!reached.has(target))return [];
        const ids=[target],used=new Set([target]);
        const back=(id:string):boolean=>{
            if(id===start)return true;
            for(const from of into.get(id)||[]){
                if(used.has(from)||!reached.has(from))continue;
                used.add(from);ids.unshift(from);
                if(back(from))return true;
                ids.shift();used.delete(from);
            }
            return false;
        };
        return back(target)?ids:[];
    }

    /**
     * A walked route as one phrase: a steady pulse that gathers (louder, a little slower over the last two chords) and settles
     * on the song the player is standing in, held like a fermata.
     */
    export function pathSteps(ids:readonly string[],midiOf:(id:string)=>readonly number[]):EchoPiano.Step[]{
        const count=ids.length,steps:EchoPiano.Step[]=[];
        let at=0;
        ids.forEach((id,i)=>{
            const last=i===count-1;
            const stretch=i===count-2?1.3:i===count-3?1.12:1;
            const span=pulse*stretch;
            steps.push({at,midi:midiOf(id),hold:last?1.8:span*legato,level:.5+.38*(count>1?i/(count-1):1),roll:last?.14:.045,release:last?2.4:undefined});
            at+=span;
        });
        return steps;
    }

    /** The finale's own tempo, dynamics and spread for each chord, in the order the author arranged them. */
    export function finaleSteps(finale:Finale,midiOf:(id:string)=>readonly number[]):EchoPiano.Step[]{
        const steps:EchoPiano.Step[]=[];
        let at=0;
        for(const step of finale.steps){
            const span=step.beats*finale.beat;
            // `gate` is the share of its span a chord sounds: short gates are stabs that leave air before the next chord.
            steps.push({at,midi:midiOf(step.node),hold:span*(step.gate??legato),level:step.level,roll:step.roll,release:step.release});
            at+=span;
        }
        return steps;
    }

    /** Seconds from the start until the last chord has faded. */
    export function length(steps:readonly EchoPiano.Step[]):number{
        const last=steps[steps.length-1];
        return last?last.at+last.hold+(last.release??.6):0;
    }
}
