export interface OpenAnswer { title:string; aliases:string[] }
export interface Decoy { title:string; aliases:string[]; message:{en:string;zh:string} }
export interface Song { id:string; title:string; aliases:string[]; next:string[]; position:[number,number]; clue:{en:string;zh:string}; hint:{en:string;zh:string}; dead_ends?:string[]; open_answers?:OpenAnswer[]; decoys?:Decoy[]; terminal?:"dead-end"|"epilogue"; quote?:string; clue_format?:'prose'|'quote'; presentation:{flower:string;chord:{midi:number[]}} }
export interface Riddle { id:string; start:string; ending:string; bonus?:string; finale?:EchoScore.Finale; nodes:Song[] }
export interface Trail { current:string; found:string[]; edges:string[]; history:string[] }
/** A score in progress: a walked path or the finale. `lit` is the song whose chord is sounding. */
export interface Playing { kind:'path'|'finale'; ids:string[]; started:boolean; lit:string; lead:number; seconds:number }
