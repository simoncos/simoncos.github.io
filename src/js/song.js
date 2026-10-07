"use strict";
// The player on a Music page. Without scripts the browser's own audio
// controls show; with them, a play button and the recording's waveform,
// which doubles as the seek bar (pointer, or arrow keys when focused).
// On a touch screen a vertical swipe over it scrolls the page; a tap or a
// sideways drag seeks.
(function () {
    const playerCandidate = document.querySelector('[data-song-player]');
    if (!playerCandidate)
        return;
    const player = playerCandidate;
    const audioCandidate = player.querySelector('audio');
    const uiCandidate = player.querySelector('.song-ui');
    const waveCandidate = player.querySelector('[data-wave]');
    const playCandidate = player.querySelector('[data-play]');
    const nowCandidate = player.querySelector('[data-now]');
    if (!audioCandidate || !uiCandidate || !waveCandidate || !playCandidate || !nowCandidate)
        return;
    const audio = audioCandidate;
    const ui = uiCandidate;
    const wave = waveCandidate;
    const play = playCandidate;
    const now = nowCandidate;
    audio.controls = false;
    audio.hidden = true;
    ui.hidden = false;
    // The page knows the length before the file does (preload is metadata
    // at most, and some browsers load nothing until asked).
    const fallback = Number(wave.getAttribute('aria-valuemax')) || 0;
    const total = () => (Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : fallback);
    const clock = (s) => {
        const whole = Math.max(0, Math.floor(s));
        return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
    };
    let frame = 0;
    function paint() {
        const t = audio.currentTime;
        const length = total();
        wave.style.setProperty('--p', length ? String(Math.min(1, t / length)) : '0');
        now.textContent = clock(t);
        wave.setAttribute('aria-valuenow', String(Math.floor(t)));
        wave.setAttribute('aria-valuetext', `${clock(t)} / ${clock(length)}`);
    }
    function loop() {
        paint();
        frame = audio.paused ? 0 : requestAnimationFrame(loop);
    }
    function sync() {
        player.classList.toggle('is-playing', !audio.paused);
        if (!audio.paused && !frame)
            frame = requestAnimationFrame(loop);
        paint();
    }
    play.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().catch(() => sync());
        }
        else {
            audio.pause();
        }
    });
    ['play', 'pause', 'ended', 'seeked', 'loadedmetadata'].forEach((name) => audio.addEventListener(name, sync));
    audio.addEventListener('ended', () => {
        audio.currentTime = 0;
    });
    function seek(to) {
        audio.currentTime = Math.min(Math.max(0, to), total());
        paint();
    }
    function seekAt(clientX) {
        const box = wave.getBoundingClientRect();
        seek(((clientX - box.left) / box.width) * total());
    }
    // A mouse seeks on press and drags at once. A finger may only be passing
    // over the waveform on its way down the page (the CSS lets the browser
    // pan vertically), so touch and pen wait until the gesture says what it
    // is: a tap seeks where it lifts, a sideways drag past DECIDE px scrubs,
    // and anything vertical is left to the page and never seeks.
    const DECIDE = 8;
    let dragging = null;
    let pending = null;
    function startDrag(event) {
        dragging = event.pointerId;
        pending = null;
        try {
            wave.setPointerCapture(event.pointerId);
        }
        catch {
            // The pointer may already be gone; the drag still follows moves.
        }
        wave.classList.add('is-dragging');
        seekAt(event.clientX);
    }
    wave.addEventListener('pointerdown', (event) => {
        if (event.button !== 0)
            return;
        if (event.pointerType === 'mouse') {
            startDrag(event);
        }
        else {
            pending = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }
    });
    wave.addEventListener('pointermove', (event) => {
        if (dragging === event.pointerId) {
            seekAt(event.clientX);
            return;
        }
        if (!pending || pending.id !== event.pointerId)
            return;
        const dx = Math.abs(event.clientX - pending.x);
        const dy = Math.abs(event.clientY - pending.y);
        if (dx < DECIDE && dy < DECIDE)
            return;
        if (dx > dy) {
            startDrag(event);
        }
        else {
            pending = null;
        }
    });
    wave.addEventListener('pointerup', (event) => {
        if (pending && pending.id === event.pointerId) {
            pending = null;
            seekAt(event.clientX);
        }
        release(event);
    });
    function release(event) {
        if (pending && pending.id === event.pointerId)
            pending = null;
        if (dragging !== event.pointerId)
            return;
        dragging = null;
        wave.classList.remove('is-dragging');
    }
    // The browser cancels the pointer when it takes the gesture for a scroll.
    wave.addEventListener('pointercancel', release);
    wave.addEventListener('keydown', (event) => {
        const steps = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -15, PageUp: 15 };
        if (event.key in steps) {
            seek(audio.currentTime + steps[event.key]);
        }
        else if (event.key === 'Home') {
            seek(0);
        }
        else if (event.key === 'End') {
            seek(total());
        }
        else {
            return;
        }
        event.preventDefault();
    });
    if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
        const title = document.querySelector('.song-title')?.textContent || '';
        const artist = player.dataset.artist || '';
        navigator.mediaSession.metadata = new MediaMetadata({ title, artist });
    }
    paint();
})();
