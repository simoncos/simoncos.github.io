/** YDP samples shared with Vocal Coach; attribution lives beside the audio files. */
namespace EchoPiano {
    export type Status = 'ready'|'loading'|'failed'|'unavailable';
    export const roots = [48,54,60,63,66,69,72];
    /** Shortest and longest chord the piano plays at once (extended chords reach six notes). */
    export const minNotes = 3, maxNotes = 6;
    /** One chord of a piece. It starts `at` seconds after the piece begins, sounds for `hold` seconds, then fades over `release`. */
    export interface Step { at:number; midi:readonly number[]; hold:number; level?:number; roll?:number; release?:number; offsets?:readonly number[] }
    export interface ScoreHooks {
        /** Audio is scheduled; the first step follows after `lead`. */
        onStart?():void;
        /** A step is sounding now, as the player hears it (output latency is subtracted). */
        onStep?(index:number,step:Step):void;
        /** Once, after onStart: true when the last chord finished, false when the piece was cut short. */
        onEnd?(finished:boolean):void;
    }
    export interface ScoreOptions { lead?:number }
    const validChord=(midis:readonly number[])=>midis.length>=minNotes&&midis.length<=maxNotes&&new Set(midis).size===midis.length&&midis.every(n=>Number.isInteger(n)&&n>=48&&n<=72);
    const finite=(value:unknown,low:number,high:number)=>typeof value==='number'&&Number.isFinite(value)&&value>=low&&value<=high;
    const nearestRoot=(midi:number)=>roots.reduce((best,n)=>Math.abs(n-midi)<Math.abs(best-midi)?n:best,roots[0]);
    const defaultRelease=.6, defaultLevel=.8;
    /**
     * Seconds of a piece kept queued ahead of the audio clock. Far more than a busy page can stall for, far less than a whole piece:
     * creating a long piece's voices in one go (165 for the finale) freezes a slow phone for a moment, and queues what may be cancelled.
     */
    const horizon=6;

    interface Run {
        request:number; steps:readonly Step[]; samples:number[][]; buffers:Map<number,AudioBuffer>; context:AudioContext; out:AudioNode;
        hooks:ScoreHooks; start:number; latency:number; next:number; queued:number; timer:number; settle:(finished:boolean)=>void;
    }

    export class Player {
        private context:AudioContext|null=null;
        private decoder:OfflineAudioContext|null=null;
        private preparation:Promise<boolean>|null=null;
        private buffers=new Map<number,Promise<AudioBuffer>>();
        private decoded=new Map<number,AudioBuffer>();
        private voices=new Map<AudioBufferSourceNode,GainNode>();
        private bus:GainNode|null=null;
        private busContext:AudioContext|null=null;
        private run:Run|null=null;
        private request=0;
        private status:Status='ready';
        constructor(private onStatus:(status:Status)=>void){}

        private report(status:Status){this.status=status;this.onStatus(status);}

        private load(root:number,context:BaseAudioContext):Promise<AudioBuffer>{
            let pending=this.buffers.get(root);
            if(!pending){
                pending=fetch(`assets/piano/ydp/root-${String(root).padStart(3,'0')}.mp3`)
                    .then(response=>{
                        if(!response.ok)throw new Error('Piano sample unavailable');
                        return response.arrayBuffer();
                    })
                    .then(bytes=>context.decodeAudioData(bytes))
                    .then(buffer=>{this.decoded.set(root,buffer);return buffer;})
                    .catch(error=>{this.buffers.delete(root);throw error;});
                this.buffers.set(root,pending);
            }
            return pending;
        }

        prepare():Promise<boolean>{
            if(this.decoded.size===roots.length)return Promise.resolve(true);
            if(this.preparation)return this.preparation;
            const Offline=window.OfflineAudioContext||(window as Window & {webkitOfflineAudioContext?:typeof OfflineAudioContext}).webkitOfflineAudioContext;
            // Decode ahead of the gesture without opening an output device or playing audio.
            // Older browsers can still use the normal interaction-time loading path.
            if(!Offline)return Promise.resolve(false);
            try{this.decoder??=new Offline(1,1,44100);}catch{return Promise.resolve(false);}
            const request=this.request;
            this.report('loading');
            this.preparation=Promise.allSettled(roots.map(root=>this.load(root,this.decoder)))
                .then(results=>{
                    const ready=results.every(result=>result.status==='fulfilled');
                    // Background completion must not override a newer click, mute or retry.
                    if(request===this.request)this.report(ready?'ready':'failed');
                    return ready;
                })
                .finally(()=>{this.preparation=null;});
            return this.preparation;
        }

        async play(midis:readonly number[]){
            const request=++this.request;
            this.endRun(false);
            try{
                if(!validChord(midis))throw new Error('Invalid chord');
                const Audio=window.AudioContext||(window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
                if(!Audio){this.report('unavailable');return;}
                // Both context creation and resume start within the user's gesture (including iOS).
                const context=this.context??=new Audio({latencyHint:'interactive'});
                const resume=context.state==='running'?null:context.resume();
                // Retire the previous chord together; rapid navigation must not stack harmonies.
                this.releaseVoices();
                const samples=midis.map(nearestRoot);
                const cached=samples.map(root=>this.decoded.get(root));
                if(!resume&&cached.every(Boolean)){
                    // Schedule before the caller redraws the graph; a warm click has no await.
                    this.sound(midis,samples,cached,context);
                    return;
                }
                if(samples.some(root=>!this.decoded.has(root)))this.report('loading');
                const [,buffers]=await Promise.all([resume,Promise.all(samples.map(root=>this.load(root,context)))]);
                // Wait for the entire chord. Never sound a partial chord as samples arrive.
                if(request!==this.request)return;
                if(context.state!=='running')throw new Error('Piano output suspended');
                this.sound(midis,samples,buffers,context);
            }catch{
                if(request===this.request)this.report('failed');
            }
        }

        private sound(midis:readonly number[],samples:number[],buffers:AudioBuffer[],context:AudioContext){
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
        }

        /**
         * Play a piece: chords at their own times with their own dynamics, notes scheduled on the audio clock a few seconds ahead
         * so a busy page cannot make it stumble. Resolves true when the last chord has faded, false when it was cancelled, failed or superseded.
         * A later play(), playScore() or stop() cancels it, and hooks.onEnd(false) tells the caller.
         */
        async playScore(steps:readonly Step[],hooks:ScoreHooks={},options:ScoreOptions={}):Promise<boolean>{
            const request=++this.request;
            this.endRun(false);
            try{
                const lead=options.lead??0;
                if(!steps.length||steps.length>256||!finite(lead,0,10))throw new Error('Invalid score');
                let previous=-1;
                for(const step of steps){
                    if(!validChord(step.midi)||!finite(step.at,0,600)||step.at<previous||!finite(step.hold,.05,60)||!finite(step.level??defaultLevel,.01,1.2)
                        ||!finite(step.roll??0,0,3)||!finite(step.release??defaultRelease,.05,12)
                        ||(step.offsets&&(step.offsets.length!==step.midi.length||!step.offsets.every(o=>finite(o,0,4)))))throw new Error('Invalid score step');
                    previous=step.at;
                }
                const Audio=window.AudioContext||(window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
                if(!Audio){this.report('unavailable');return false;}
                const context=this.context??=new Audio({latencyHint:'interactive'});
                const resume=context.state==='running'?null:context.resume();
                this.releaseVoices();
                const samples=steps.map(step=>step.midi.map(nearestRoot));
                const needed=[...new Set(samples.flat())];
                let buffers:Map<number,AudioBuffer>;
                if(!resume&&needed.every(root=>this.decoded.has(root)))buffers=this.decoded;
                else{
                    if(needed.some(root=>!this.decoded.has(root)))this.report('loading');
                    await Promise.all([resume,Promise.all(needed.map(root=>this.load(root,context)))]);
                    // A newer click, score or mute decided the cold start was no longer wanted.
                    if(request!==this.request)return false;
                    if(context.state!=='running')throw new Error('Piano output suspended');
                    buffers=this.decoded;
                }
                return await new Promise<boolean>(resolve=>this.begin(steps,samples,buffers,context,request,hooks,lead,resolve));
            }catch{
                if(request===this.request)this.report('failed');
                return false;
            }
        }

        private begin(steps:readonly Step[],samples:number[][],buffers:Map<number,AudioBuffer>,context:AudioContext,request:number,hooks:ScoreHooks,lead:number,settle:(finished:boolean)=>void){
            const out=this.output(context),start=context.currentTime+.08+lead;
            const bus=this.bus;
            // Fresh bus level: a previous cancellation faded it out.
            bus.gain.cancelScheduledValues(context.currentTime);bus.gain.setValueAtTime(1,context.currentTime);
            const latency=Math.min(.25,Math.max(0,Number(context.outputLatency)||0));
            const run:Run={request,steps,samples,buffers,context,out,hooks,start,latency,next:0,queued:0,timer:0,settle};
            this.run=run;
            this.queue(run,horizon);
            this.report('ready');
            hooks.onStart?.();
            const last=steps[steps.length-1],finish=last.at+Math.max(last.hold,.03)+(last.release??defaultRelease);
            // The audio clock plays what is queued; this loop keeps the queue topped up and tells the page when each chord is heard.
            const poll=()=>{
                if(this.run!==run)return;
                const elapsed=context.currentTime-start,now=elapsed-latency;
                this.queue(run,elapsed+horizon);
                while(run.next<steps.length&&steps[run.next].at<=now+.004){const index=run.next++;hooks.onStep?.(index,steps[index]);if(this.run!==run)return;}
                if(now>=finish){this.endRun(true);return;}
                run.timer=setTimeout(poll,16) as unknown as number;
            };
            poll();
        }

        /** Queue the voices of every chord that begins before `until` seconds into the piece and is not queued yet. */
        private queue(run:Run,until:number){
            const {steps,samples,buffers,context,out,start}=run;
            while(run.queued<steps.length&&steps[run.queued].at<=until){
                const i=run.queued++,step=steps[i];
                const count=step.midi.length,level=.22*(step.level??defaultLevel)/Math.sqrt(count),roll=step.roll??0;
                const fade=start+step.at+Math.max(step.hold,.03),release=step.release??defaultRelease;
                for(let j=0;j<count;j++){
                    // The roll spreads the chord low to high, like a hand; zero keeps it a block. A figure gives each note its own entry.
                    const when=start+step.at+(step.offsets?step.offsets[j]:count>1?roll*j/(count-1):0),hold=Math.max(fade,when+.02);
                    const source=context.createBufferSource(),gain=context.createGain();
                    source.buffer=buffers.get(samples[i][j]);
                    source.playbackRate.setValueAtTime(Math.pow(2,(step.midi[j]-samples[i][j])/12),when);
                    gain.gain.setValueAtTime(.0001,when);
                    gain.gain.linearRampToValueAtTime(level,when+.008);
                    gain.gain.setValueAtTime(level,hold);
                    gain.gain.exponentialRampToValueAtTime(.0001,hold+release);
                    source.connect(gain);gain.connect(out);
                    this.voices.set(source,gain);
                    source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};
                    source.start(when);source.stop(hold+release+.03);
                }
            }
        }

        /** Every score voice shares one master bus, so a cancelled piece can fade as a whole and overlapping chords cannot clip. */
        private output(context:AudioContext):AudioNode{
            if(!this.bus||this.busContext!==context){
                const input=context.createGain();
                const compressor=typeof context.createDynamicsCompressor==='function'?context.createDynamicsCompressor():null;
                if(compressor){
                    compressor.threshold.setValueAtTime(-16,context.currentTime);compressor.knee.setValueAtTime(20,context.currentTime);
                    compressor.ratio.setValueAtTime(3,context.currentTime);compressor.attack.setValueAtTime(.006,context.currentTime);compressor.release.setValueAtTime(.3,context.currentTime);
                    input.connect(compressor);compressor.connect(context.destination);
                }else input.connect(context.destination);
                this.bus=input;this.busContext=context;
            }
            return this.bus;
        }

        private endRun(finished:boolean){
            const run=this.run;
            if(!run)return;
            this.run=null;
            clearTimeout(run.timer);
            // A cancelled piece fades with its master bus instead of stopping on a click.
            if(!finished&&this.bus&&this.context){
                const now=this.context.currentTime;
                this.bus.gain.cancelScheduledValues(now);this.bus.gain.setTargetAtTime(0,now,.02);
            }
            run.hooks.onEnd?.(finished);
            run.settle(finished);
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
            this.endRun(false);
            this.releaseVoices();
            if(this.status==='loading')this.report('ready');
        }
    }
}
