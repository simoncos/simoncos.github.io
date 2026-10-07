import {required} from "../lib/dom";
import type {Song} from "./types";
export function createSound(root: HTMLElement, soundKey: string, t: (en: string, zh: string) => string, onRenderScore: () => void) {

    let soundEnabled=true,soundStatus:EchoPiano.Status='ready';
    try{soundEnabled=localStorage.getItem(soundKey)!=='off';}catch{}
    // echo-piano.js is a separate file. If it fails to load the riddle still runs, in silence, and the sound control says so.
    const piano=typeof EchoPiano==='undefined'?null:new EchoPiano.Player(status=>{soundStatus=status;renderSound();});
    if(!piano)soundStatus='unavailable';
    function preparePiano(){if(piano&&soundEnabled&&!document.hidden)void piano.prepare();}
    function renderSound(){
        const button=required(root.querySelector<HTMLButtonElement>('[data-sound]'), "'[data-sound]'");
        button.disabled=soundStatus==='unavailable';
        button.dataset.state=soundStatus==='unavailable'?'unavailable':!soundEnabled?'off':soundStatus==='loading'?'loading':soundStatus==='failed'?'failed':'on';
        button.setAttribute('aria-pressed',String(soundEnabled&&soundStatus!=='unavailable'&&soundStatus!=='failed'));
        button.setAttribute('aria-busy',String(soundStatus==='loading'));
        required(root.querySelector('[data-sound-label]'), "'[data-sound-label]'").textContent=soundStatus==='unavailable'?t('Sound unavailable','音效不可用'):!soundEnabled?t('Sound off','音效：关'):soundStatus==='loading'?t('Loading piano…','加载钢琴…'):soundStatus==='failed'?t('Retry sound','重试音效'):t('Sound on','音效：开');
        button.title=t('A piano chord when you discover or select a song','发现或点击已点亮的歌曲时，播放钢琴和弦');
        const replay=required(root.querySelector<HTMLButtonElement>('[data-replay]'), "'[data-replay]'");
        replay.disabled=!soundEnabled||soundStatus==='unavailable';
        onRenderScore();
    }
    function playChord(song:Song){
        if(!soundEnabled)return;
        if(!song||!piano)return;
        void piano.play(song.presentation.chord.midi);
        // A running score ends through its onEnd hook; one still loading has none yet.
    }
    return {get enabled() {return soundEnabled;}, set enabled(value: boolean) {soundEnabled=value;}, get status() {return soundStatus;}, piano, prepare:preparePiano, render:renderSound, play:playChord};
}
