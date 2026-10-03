/** YDP samples shared with Vocal Coach; attribution lives beside the audio files. */
namespace EchoPiano {
    export type Status = 'ready'|'loading'|'failed'|'unavailable';
    export const roots = [48,54,60,63,66,69,72];

    export class Player {
        private context:AudioContext|null=null;
        private buffers=new Map<number,Promise<AudioBuffer>>();
        private decoded=new Set<number>();
        private voices=new Map<AudioBufferSourceNode,GainNode>();
        private request=0;
        private status:Status='ready';
        constructor(private onStatus:(status:Status)=>void){}

        private report(status:Status){this.status=status;this.onStatus(status);}

        private load(root:number,context:AudioContext):Promise<AudioBuffer>{
            let pending=this.buffers.get(root);
            if(!pending){
                pending=fetch(`assets/piano/ydp/root-${String(root).padStart(3,'0')}.mp3`)
                    .then(response=>{
                        if(!response.ok)throw new Error('Piano sample unavailable');
                        return response.arrayBuffer();
                    })
                    .then(bytes=>context.decodeAudioData(bytes))
                    .then(buffer=>{this.decoded.add(root);return buffer;})
                    .catch(error=>{this.buffers.delete(root);throw error;});
                this.buffers.set(root,pending);
            }
            return pending;
        }

        async play(midis:readonly number[]){
            const request=++this.request;
            try{
                if(midis.length<3||midis.length>4||new Set(midis).size!==midis.length||midis.some(n=>!Number.isInteger(n)||n<48||n>72))throw new Error('Invalid chord');
                const Audio=window.AudioContext||(window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
                if(!Audio){this.report('unavailable');return;}
                // Both context creation and resume start within the user's gesture (including iOS).
                const context=this.context??=new Audio();
                const resume=context.state==='running'?Promise.resolve():context.resume();
                // Retire the previous chord together; rapid navigation must not stack harmonies.
                this.releaseVoices();
                const samples=midis.map(midi=>roots.reduce((best,n)=>Math.abs(n-midi)<Math.abs(best-midi)?n:best,roots[0]));
                if(samples.some(root=>!this.decoded.has(root)))this.report('loading');
                const [,buffers]=await Promise.all([resume,Promise.all(samples.map(root=>this.load(root,context)))]);
                // Wait for the entire chord. Never sound a partial chord as samples arrive.
                if(request!==this.request)return;
                if(context.state!=='running')throw new Error('Piano output suspended');
                const now=context.currentTime+.01;
                const level=.22/Math.sqrt(midis.length);
                for(let i=0;i<midis.length;i++){
                    const source=context.createBufferSource(),gain=context.createGain();
                    source.buffer=buffers[i];
                    source.playbackRate.setValueAtTime(Math.pow(2,(midis[i]-samples[i])/12),now);
                    // One shared start time: a simultaneous chord, never an arpeggio.
                    // Scale per-note gain so four notes do not become four times as loud.
                    gain.gain.setValueAtTime(.0001,now);
                    gain.gain.linearRampToValueAtTime(level,now+.008);
                    gain.gain.setValueAtTime(level,now+1.05);
                    gain.gain.exponentialRampToValueAtTime(.0001,now+1.4);
                    source.connect(gain);gain.connect(context.destination);
                    this.voices.set(source,gain);
                    source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};
                    source.start(now);source.stop(now+1.42);
                }
                this.report('ready');
            }catch{
                if(request===this.request)this.report('failed');
            }
        }

        private release(source:AudioBufferSourceNode,gain:GainNode,now:number){
            gain.gain.cancelScheduledValues(now);
            gain.gain.setTargetAtTime(0,now,.008);
            source.stop(now+.04);
        }

        private releaseVoices(){
            if(!this.context)return;
            for(const [source,gain] of this.voices)this.release(source,gain,this.context.currentTime);
            this.voices.clear();
        }

        stop(){
            ++this.request;
            this.releaseVoices();
            if(this.status==='loading')this.report('ready');
        }
    }
}
