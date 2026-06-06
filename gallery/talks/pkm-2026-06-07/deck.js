/* === Block 0 === */
// Windows 平台标记 — 雅黑没有 ExtraLight,需要字重补偿
  if(/Win/i.test(navigator.platform || navigator.userAgentData?.platform || '')){
    document.body.classList.add('is-win');
  }
  (function(){
    const KEY = 'guizang-ppt-low-power';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stored = localStorage.getItem(KEY);
    window.__lowPowerMode = stored === '0' ? false : true; // B/static mode is default for talk backup/PDF export
    function updateHint(){
      const hint = document.getElementById('hint');
      if(hint) hint.textContent = `← → 翻页 · B ${window.__lowPowerMode ? '动态' : '静态'} · ESC 索引`;
    }
    window.__setLowPowerMode = function(on, opts={}){
      window.__lowPowerMode = !!on;
      document.body.classList.toggle('low-power', window.__lowPowerMode);
      if(opts.persist !== false) localStorage.setItem(KEY, window.__lowPowerMode ? '1' : '0');
      if(window.__lowPowerMode && document.getAnimations){
        document.getAnimations().forEach(a=>a.cancel());
      }
      updateHint();
      dispatchEvent(new CustomEvent('swiss-low-power-change', {detail:{on:window.__lowPowerMode}}));
      if(window.__playSlide) window.__playSlide(window.__currentSlideIndex || 0);
    };
    document.body.classList.toggle('low-power', window.__lowPowerMode);
    addEventListener('DOMContentLoaded', updateHint, {once:true});
  })();

/* === Block 1 === */
/* =============== WebGL 网格背景 (瑞士风专用) ===============
   极简移动网格 + 微弱点阵叠加,营造"工业感、精准感"
   - 主网格: 缓慢漂移的细线网格
   - 次级: 鼠标附近的极细点阵微扰
   - 颜色: 跟随主题(浅底深线 / 深底亮线),配合 mix-blend-mode
*/
const VS = `attribute vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}`;

const FS = `precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_dark; // 0 = light, 1 = dark
uniform vec3 u_accent;

float gridLine(vec2 uv, float spacing, float thickness){
  vec2 g = abs(fract(uv / spacing) - 0.5);
  float d = min(g.x, g.y);
  return 1.0 - smoothstep(thickness - 0.005, thickness + 0.005, d);
}

float dot2(vec2 p){ return dot(p,p); }

void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = uv;
  p.x *= aspect;

  // 缓慢平移
  vec2 drift = vec2(u_time * 0.008, u_time * 0.005);
  vec2 gp = p + drift;

  // 主细网格 (大间距)
  float mainGrid = gridLine(gp, 0.12, 0.012);
  // 次级网格 (更细更密)
  float subGrid = gridLine(gp, 0.024, 0.04) * 0.4;

  // 鼠标附近的强化
  vec2 m = u_mouse;
  m.x *= aspect;
  float md = length(p - m);
  float mInfluence = exp(-md * 4.0) * 0.5;

  float gridStrength = (mainGrid + subGrid * 0.5) * (0.45 + mInfluence);

  // 点阵 (作为基底)
  vec2 dotGrid = fract(gp * 50.0) - 0.5;
  float dotMask = 1.0 - smoothstep(0.05, 0.14, length(dotGrid));
  // 用低频噪声调制点阵密度
  float wave = sin(gp.x * 1.4 + u_time * 0.15) * cos(gp.y * 1.6 - u_time * 0.12);
  dotMask *= smoothstep(-0.3, 0.6, wave) * 0.6;

  // 颜色: 浅底用深线条,深底用浅线条;高亮处带 accent 痕迹
  vec3 lineColor = mix(vec3(0.08), vec3(0.92), u_dark);
  vec3 bgColor = mix(vec3(0.97, 0.97, 0.96), vec3(0.06, 0.06, 0.07), u_dark);

  // accent 暗示 (鼠标附近偷渡一点 accent 色)
  vec3 col = bgColor;
  col = mix(col, lineColor, gridStrength * 0.55);
  col = mix(col, lineColor, dotMask * 0.35);
  col = mix(col, u_accent, mInfluence * 0.18);

  gl_FragColor = vec4(col, 1.0);
}`;

const mouse={x:0.5,y:0.5};
addEventListener('mousemove',e=>{mouse.x=e.clientX/innerWidth;mouse.y=1-e.clientY/innerHeight});

function bootGL(canvasId, fsSrc){
  const canvas=document.getElementById(canvasId);
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
  if(!gl) return ()=>false;
  const mk=(t,s)=>{const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);return sh};
  const prog=gl.createProgram();
  gl.attachShader(prog,mk(gl.VERTEX_SHADER,VS));
  gl.attachShader(prog,mk(gl.FRAGMENT_SHADER,fsSrc));
  gl.linkProgram(prog);gl.useProgram(prog);
  const buf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(prog,'position');
  gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const lRes=gl.getUniformLocation(prog,'u_resolution');
  const lT=gl.getUniformLocation(prog,'u_time');
  const lM=gl.getUniformLocation(prog,'u_mouse');
  const lD=gl.getUniformLocation(prog,'u_dark');
  const lA=gl.getUniformLocation(prog,'u_accent');
  const resize=()=>{
    const d=Math.min(window.devicePixelRatio||1,2);
    canvas.width=innerWidth*d;canvas.height=innerHeight*d;
    gl.viewport(0,0,canvas.width,canvas.height);
  };
  addEventListener('resize',resize);resize();

  // 读取 CSS 变量,把 accent 颜色塞进 shader
  function readAccent(){
    const cs = getComputedStyle(document.documentElement);
    const hex = cs.getPropertyValue('--accent').trim() || '#002FA7';
    const m = hex.match(/^#([0-9a-f]{6})$/i);
    if(!m) return [0, 0.18, 0.65];
    const n = parseInt(m[1], 16);
    return [((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255];
  }
  let accent = readAccent();
  let dark = 0;

  return (tSec, isDark)=>{
    if(isDark !== undefined) dark = isDark ? 1 : 0;
    accent = readAccent();
    gl.uniform2f(lRes,canvas.width,canvas.height);
    gl.uniform1f(lT,tSec);
    gl.uniform2f(lM,mouse.x,mouse.y);
    gl.uniform1f(lD,dark);
    gl.uniform3f(lA,accent[0],accent[1],accent[2]);
    gl.drawArrays(gl.TRIANGLES,0,6);
    return true;
  };
}
// canvas-mode / low-power: skip WebGL draw loop (no active RAF loop)
let darkMode=false;
let gridCtrl=null, gridRAF=0, gridT0=Date.now();
function startGrid(){
  if(document.body.classList.contains('canvas-mode') || window.__lowPowerMode || gridRAF) return;
  if(!gridCtrl) gridCtrl = bootGL('bg-grid',FS);
  if(!gridCtrl) return;
  gridT0=Date.now();
  function loop(){
    if(window.__lowPowerMode){gridRAF=0;return;}
    const t=(Date.now()-gridT0)/1000;
    gridCtrl(t, darkMode);
    gridRAF=requestAnimationFrame(loop);
  }
  gridRAF=requestAnimationFrame(loop);
}
function stopGrid(){
  if(gridRAF) cancelAnimationFrame(gridRAF);
  gridRAF=0;
}
if(document.body.classList.contains('canvas-mode')){
  const c=document.getElementById('bg-grid');
  if(c) c.remove();
}else{
  startGrid();
}
addEventListener('swiss-low-power-change', e=>{e.detail.on ? stopGrid() : startGrid();});

// =============== 导航 ===============
const deck=document.getElementById('deck');
const slides=deck.querySelectorAll('.slide');
const nav=document.getElementById('nav');
let idx=0,total=slides.length,lock=false;

deck.style.width=(total*100)+'vw';

slides.forEach((s,i)=>{
  const b=document.createElement('button');
  b.className='dot';b.dataset.i=i;b.setAttribute('aria-label','Page '+(i+1));
  b.onclick=()=>go(i);
  nav.appendChild(b);
});

function go(n){
  if(lock)return;
  idx=Math.max(0,Math.min(total-1,n));
  window.__currentSlideIndex = idx;
  deck.style.transform=`translateX(${-idx*100}vw)`;
  nav.querySelectorAll('.dot').forEach((d,i)=>d.classList.toggle('active',i===idx));
  const el=slides[idx];
  const isDark = el.classList.contains('dark') || el.classList.contains('accent');
  document.body.classList.toggle('dark-bg', isDark);
  darkMode = isDark;
  if(window.__playSlide) setTimeout(()=>window.__playSlide(idx), 450);
  lock=true;setTimeout(()=>lock=false,700);
}

/* =============== ESC 索引视图 =============== */
let overviewOn=false;
const ov=document.createElement('div');
ov.id='overview';
ov.style.cssText='position:fixed;inset:0;z-index:100;background:rgba(250,250,248,.96);backdrop-filter:blur(12px);display:none;overflow-y:auto;padding:4vh 4vw';
document.body.appendChild(ov);

function buildOverview(){
  ov.innerHTML='';
  const grid=document.createElement('div');
  grid.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:2vh 1.6vw;max-width:90vw;margin:0 auto';
  slides.forEach((s,i)=>{
    const card=document.createElement('div');
    card.style.cssText='cursor:pointer;overflow:hidden;border:2px solid '+(i===idx?'var(--accent)':'rgba(0,0,0,.12)')+';transition:border-color .2s';
    card.onmouseenter=()=>card.style.borderColor='rgba(0,0,0,.4)';
    card.onmouseleave=()=>card.style.borderColor=i===idx?'var(--accent)':'rgba(0,0,0,.12)';
    const wrap=document.createElement('div');
    const isDark = s.classList.contains('dark') || s.classList.contains('accent');
    wrap.style.cssText='width:100%;aspect-ratio:16/9;overflow:hidden;position:relative;pointer-events:none;background:'+(isDark?'var(--ink)':'var(--paper)');
    const clone=s.cloneNode(true);
    clone.style.cssText='width:100vw;height:100vh;transform:scale('+(1/4.5)+');transform-origin:top left;position:absolute;top:0;left:0;pointer-events:none';
    wrap.appendChild(clone);
    const label=document.createElement('div');
    label.style.cssText='padding:6px 10px;font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink);opacity:.7';
    label.textContent=(i+1)+' / '+total;
    card.appendChild(wrap);
    card.appendChild(label);
    card.onclick=()=>{toggleOverview();go(i)};
    grid.appendChild(card);
  });
  ov.appendChild(grid);
}

function toggleOverview(){
  overviewOn=!overviewOn;
  if(overviewOn){buildOverview();ov.style.display='block';}
  else{ov.style.display='none';}
}

addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();toggleOverview();return;}
  if(e.key && e.key.toLowerCase()==='b' && !e.metaKey && !e.ctrlKey && !e.altKey){
    e.preventDefault();
    window.__setLowPowerMode(!window.__lowPowerMode);
    return;
  }
  if(overviewOn)return;
  if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '||e.key==='ArrowDown'){
    if(window.__pipeAdvance && window.__pipeAdvance()) return;
    go(idx+1);
    return;
  }
  if(e.key==='ArrowLeft'||e.key==='PageUp'||e.key==='ArrowUp')go(idx-1);
  if(e.key==='Home')go(0);
  if(e.key==='End')go(total-1);
});

let wheelTO=null,wheelAcc=0;
addEventListener('wheel',e=>{
  wheelAcc+=e.deltaY+e.deltaX;
  if(Math.abs(wheelAcc)>50){
    if(wheelAcc>0 && window.__pipeAdvance && window.__pipeAdvance()){
      wheelAcc=0;
    }else{
      go(idx+(wheelAcc>0?1:-1));wheelAcc=0;
    }
  }
  clearTimeout(wheelTO);wheelTO=setTimeout(()=>wheelAcc=0,150);
},{passive:true});

let tx=0,ty=0;
addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY},{passive:true});
addEventListener('touchend',e=>{
  const dx=(e.changedTouches[0].clientX-tx);
  const dy=(e.changedTouches[0].clientY-ty);
  if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){
    if(dx<0 && window.__pipeAdvance && window.__pipeAdvance()) return;
    go(idx+(dx<0?1:-1));
  }
},{passive:true});

const params = new URLSearchParams(location.search);
if(params.get('mode') === 'dynamic') window.__setLowPowerMode(false, {persist:false});
if(params.get('mode') === 'static' || params.get('pdf') === '1') window.__setLowPowerMode(true, {persist:false});
const initialSlideParam = params.get('slide');
const initialSlide = initialSlideParam ? Number(initialSlideParam) - 1 : 0;
go(Number.isFinite(initialSlide) ? initialSlide : 0);

/* === Block 3 === */
/* ============== ASCII 点阵呼吸场 · IKB 封面/封底专用 ==============
   sin/cos 二维噪声场驱动字符显隐,营造工业仪表板的"涌动呼吸"质感.
   纯 canvas 2D, mix-blend-mode:screen 让字符在 IKB 底色上自然发亮.
   用法:在需要呼吸场的容器(.canvas-card 或 split .half.b-accent)内首位插入
        <canvas class="ascii-bg" aria-hidden="true">,本脚本会自动扫描并启动. */
(function(){
  const canvases = [...document.querySelectorAll('canvas.ascii-bg')];
  if(!canvases.length) return;

  const PALETTE = '   ...:::---+++***◦◦••▢▣';
  const CELL = 16;
  const FONT_SIZE = 13;

  function setup(c){
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = c.getBoundingClientRect();
    if(rect.width < 4 || rect.height < 4) return false;
    c.width = Math.round(rect.width * dpr);
    c.height = Math.round(rect.height * dpr);
    c.__dpr = dpr;
    c.__w = rect.width;
    c.__h = rect.height;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const mono = (getComputedStyle(document.documentElement).getPropertyValue('--mono') || 'JetBrains Mono, monospace').trim();
    ctx.font = `500 ${FONT_SIZE}px ${mono}`;
    ctx.textBaseline = 'top';
    c.__ctx = ctx;
    return true;
  }

  function draw(c, t){
    if(!c.__ctx) return;
    const ctx = c.__ctx, w = c.__w, h = c.__h;
    ctx.clearRect(0, 0, w, h);
    const cols = Math.ceil(w / CELL);
    const rows = Math.ceil(h / CELL);
    for(let r=0; r<rows; r++){
      for(let cc=0; cc<cols; cc++){
        const n = (
          Math.sin(cc * 0.18 + t) +
          Math.sin(r * 0.24 - t * 0.7) +
          Math.sin((cc + r) * 0.12 + t * 0.45) +
          Math.sin(Math.hypot(cc - cols * 0.5, r - rows * 0.5) * 0.16 - t * 0.55)
        ) / 4; // [-1, 1]
        const v = (n + 1) / 2; // [0, 1]
        if(v < 0.22) continue;
        const idx = Math.min(PALETTE.length - 1, Math.floor(v * PALETTE.length));
        const ch = PALETTE[idx];
        if(ch === ' ') continue;
        const alpha = 0.08 + (v - 0.22) * 0.55;
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.fillText(ch, cc * CELL, r * CELL);
      }
    }
  }

  function resizeAll(){ canvases.forEach(setup); }
  let pending = null;
  window.addEventListener('resize', ()=>{
    if(window.__lowPowerMode) return;
    if(pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(resizeAll);
  }, {passive:true});

  let t0 = performance.now();
  let frame = 0, asciiRAF = 0, running = false;
  function tick(now){
    if(!running || window.__lowPowerMode){running=false;asciiRAF=0;return;}
    const t = (now - t0) / 1000 * 0.55;
    frame++;
    canvases.forEach(c=>{
      // 离屏 slide 降帧:每 4 帧渲染一次,在屏 slide 每帧渲染
      const slide = c.closest('.slide');
      const rect = slide ? slide.getBoundingClientRect() : null;
      const onscreen = rect && rect.right > 0 && rect.left < window.innerWidth;
      if(!onscreen && (frame & 3) !== 0) return;
      draw(c, t);
    });
    asciiRAF = requestAnimationFrame(tick);
  }
  function start(){
    if(running || window.__lowPowerMode) return;
    resizeAll();
    t0 = performance.now();
    frame = 0;
    running = true;
    asciiRAF = requestAnimationFrame(tick);
  }
  function stop(){
    running = false;
    if(asciiRAF) cancelAnimationFrame(asciiRAF);
    if(pending) cancelAnimationFrame(pending);
    asciiRAF = 0;
    pending = null;
    canvases.forEach(c=>{
      if(c.__ctx) c.__ctx.clearRect(0,0,c.__w || 0,c.__h || 0);
    });
  }
  addEventListener('swiss-low-power-change', e=>{e.detail.on ? stop() : start();});
  start();
})();

/* === Block 4 === */
(function(){
  var lb=document.getElementById('img-lightbox');
  var stage=lb.querySelector('.lb-stage');
  var lbImg=lb.querySelector('img');
  var hint=lb.querySelector('.hint');
  var focusLabel=lb.querySelector('.focus-label');
  var gallery=[];var gi=0;var isOpen=false;var justClosedByKey=false;var currentItem=null;

  function getCurrentSection(){
    var deck=document.getElementById('deck');
    if(!deck)return null;
    var s=deck.style.transform||'';
    var m=s.match(/translateX\((-?\d+(?:\.\d+)?)vw\)/);
    if(!m)return null;
    var idx=Math.round(Math.abs(parseFloat(m[1]))/100);
    var secs=deck.querySelectorAll(':scope>section.slide');
    return secs[idx]||null;
  }

  function parseFocuses(img){
    var raw=img.getAttribute('data-focuses')||'';
    if(!raw.trim())return [];
    return raw.split(';').map(function(part,idx){
      var bits=part.split('|');
      var label=(bits[0]||('Focus '+(idx+1))).trim();
      var x=parseFloat(bits[1]);var y=parseFloat(bits[2]);var scale=parseFloat(bits[3]);
      return {
        label:label,
        x:Number.isFinite(x)?x:50,
        y:Number.isFinite(y)?y:50,
        scale:Number.isFinite(scale)?scale:1,
        n:idx+1
      };
    });
  }

  function buildGallery(sec){
    var imgs=Array.from(sec.querySelectorAll('img.zoomable'));
    var items=[];
    imgs.forEach(function(img){
      items.push({img:img,src:img.src,alt:img.alt||'',mode:'full',label:'FULL'});
      parseFocuses(img).forEach(function(focus){
        items.push({img:img,src:img.src,alt:img.alt||'',mode:'focus',focus:focus,label:focus.label});
      });
    });
    return items;
  }

  function resetTransform(){
    lb.style.setProperty('--lb-pan-x','0px');
    lb.style.setProperty('--lb-pan-y','0px');
    lb.style.setProperty('--lb-focus-scale','1');
  }

  function applyFocusTransform(item){
    currentItem=item||null;
    if(!item||item.mode!=='focus'||!item.focus){
      resetTransform();
      return;
    }
    if(!lbImg.naturalWidth||!lbImg.naturalHeight)return;
    var stageRect=stage.getBoundingClientRect();
    var fit=Math.min(stageRect.width/lbImg.naturalWidth,stageRect.height/lbImg.naturalHeight);
    var fittedW=lbImg.naturalWidth*fit;
    var fittedH=lbImg.naturalHeight*fit;
    var scale=Math.max(1,Number(item.focus.scale)||1);
    var dx=((item.focus.x/100)-0.5)*fittedW;
    var dy=((item.focus.y/100)-0.5)*fittedH;
    lb.style.setProperty('--lb-pan-x',(-dx*scale).toFixed(1)+'px');
    lb.style.setProperty('--lb-pan-y',(-dy*scale).toFixed(1)+'px');
    lb.style.setProperty('--lb-focus-scale',scale.toFixed(3));
  }

  function scheduleFocusTransform(item){
    currentItem=item||null;
    if(!item||item.mode!=='focus'){
      applyFocusTransform(null);
      return;
    }
    if(lbImg.complete&&lbImg.naturalWidth){
      requestAnimationFrame(function(){applyFocusTransform(item)});
      return;
    }
    lbImg.onload=function(){applyFocusTransform(currentItem)};
  }

  function openFromCurrentSlide(){
    var sec=getCurrentSection();
    if(!sec)return false;
    gallery=buildGallery(sec);
    if(gallery.length===0)return false;
    show(0,{keepOpen:true});
    lb.classList.add('open');isOpen=true;justClosedByKey=false;
    return true;
  }

  function show(idx,opts){
    if(idx<0){justClosedByKey=true;close();return}
    if(idx>=gallery.length){justClosedByKey=true;close();return}
    gi=idx;
    var item=gallery[gi];
    var srcChanged=lbImg.src!==item.src;
    if(srcChanged)resetTransform();
    lbImg.onload=null;
    lbImg.src=item.src;lbImg.alt=item.alt||'';
    lb.classList.toggle('focus-mode',item.mode==='focus');
    if(item.mode==='focus'){
      focusLabel.textContent=(item.focus.n||'')+' · '+item.label;
      scheduleFocusTransform(item);
    }else{
      focusLabel.textContent='';
      scheduleFocusTransform(null);
    }
    var hasFocus=gallery.some(function(x){return x.mode==='focus'});
    hint.textContent=hasFocus?'← / → ZOOM · 1-3 FOCUS · 0 FULL · ESC':'← / → IMAGE · ESC';
    if(opts&&opts.keepOpen)return;
  }

  function close(){
    lb.classList.remove('open','focus-mode');
    lbImg.onload=null;lbImg.src='';focusLabel.textContent='';currentItem=null;resetTransform();isOpen=false;
  }

  function jumpFocus(num){
    if(!gallery.length)return false;
    var current=gallery[gi]&&gallery[gi].img;
    var target=gallery.findIndex(function(item){
      return item.img===current && ((num===0&&item.mode==='full')||(item.mode==='focus'&&item.focus.n===num));
    });
    if(target<0)return false;
    show(target);return true;
  }

  // Click: open zoomable image
  document.addEventListener('click',function(e){
    var t=e.target;
    if(t&&t.classList&&t.classList.contains('zoomable')){
      e.preventDefault();e.stopPropagation();
      var sec=t.closest('section.slide');
      if(sec)gallery=buildGallery(sec);
      gi=gallery.findIndex(function(item){return item.img===t&&item.mode==='full'});
      if(gi<0)gi=0;
      show(gi,{keepOpen:true});
      lb.classList.add('open');isOpen=true;justClosedByKey=false;
    }
    else if(t===lb||t===stage){close()}
  },true);

  // Keyboard: intercept when lightbox open, or when slide has zoomable images
  document.addEventListener('keydown',function(e){
    if(isOpen){
      e.stopImmediatePropagation();e.preventDefault();
      if(e.key==='Escape'||e.key==='Backspace'){justClosedByKey=true;close()}
      else if(e.key==='ArrowRight'||e.key==='ArrowDown'||e.key==='PageDown'){show(gi+1)}
      else if(e.key==='ArrowLeft'||e.key==='ArrowUp'||e.key==='PageUp'){show(gi-1)}
      else if(/^[0-9]$/.test(e.key)){jumpFocus(Number(e.key))}
      return;
    }
    // Lightbox closed: check if current slide has zoomable images
    if(e.key==='ArrowRight'||e.key==='ArrowDown'||e.key==='PageDown'){
      if(justClosedByKey){justClosedByKey=false;return}
      if(openFromCurrentSlide()){
        e.stopImmediatePropagation();e.preventDefault();
      }
    }
  },true);

  document.addEventListener('wheel',function(e){
    if(!isOpen)return;
    e.stopImmediatePropagation();e.preventDefault();
    var delta=e.deltaY||e.deltaX||0;
    if(Math.abs(delta)<8)return;
    show(gi+(delta>0?1:-1));
  },{capture:true,passive:false});

  addEventListener('resize',function(){
    if(!isOpen)return;
    requestAnimationFrame(function(){applyFocusTransform(gallery[gi]||currentItem)});
  },{passive:true});

})();
