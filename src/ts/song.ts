// The player on a Music page. Without scripts the browser's own audio
// controls show; with them, a play button and the recording's waveform,
// which doubles as the seek bar (pointer, or arrow keys when focused).
(function () {
    const player = document.querySelector<HTMLElement>('[data-song-player]');
    if (!player) return;
    const audio = player.querySelector<HTMLAudioElement>('audio');
    const ui = player.querySelector<HTMLElement>('.song-ui');
    const wave = player.querySelector<HTMLElement>('[data-wave]');
    const play = player.querySelector<HTMLButtonElement>('[data-play]');
    const now = player.querySelector<HTMLElement>('[data-now]');
    if (!audio || !ui || !wave || !play || !now) return;

    audio.controls = false;
    audio.hidden = true;
    ui.hidden = false;

    // The page knows the length before the file does (preload is metadata
    // at most, and some browsers load nothing until asked).
    const fallback = Number(wave.getAttribute('aria-valuemax')) || 0;
    const total = () => (Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : fallback);
    const clock = (s: number) => {
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
        if (!audio.paused && !frame) frame = requestAnimationFrame(loop);
        paint();
    }

    play.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().catch(() => sync());
        } else {
            audio.pause();
        }
    });
    ['play', 'pause', 'ended', 'seeked', 'loadedmetadata'].forEach((name) => audio.addEventListener(name, sync));
    audio.addEventListener('ended', () => {
        audio.currentTime = 0;
    });

    function seek(to: number) {
        audio.currentTime = Math.min(Math.max(0, to), total());
        paint();
    }
    function seekAt(clientX: number) {
        const box = wave.getBoundingClientRect();
        seek(((clientX - box.left) / box.width) * total());
    }

    let dragging: number | null = null;
    wave.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        dragging = event.pointerId;
        wave.setPointerCapture(event.pointerId);
        wave.classList.add('is-dragging');
        seekAt(event.clientX);
    });
    wave.addEventListener('pointermove', (event) => {
        if (dragging === event.pointerId) seekAt(event.clientX);
    });
    const release = (event: PointerEvent) => {
        if (dragging !== event.pointerId) return;
        dragging = null;
        wave.classList.remove('is-dragging');
    };
    wave.addEventListener('pointerup', release);
    wave.addEventListener('pointercancel', release);

    wave.addEventListener('keydown', (event) => {
        const steps: Record<string, number> = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -15, PageUp: 15 };
        if (event.key in steps) {
            seek(audio.currentTime + steps[event.key]);
        } else if (event.key === 'Home') {
            seek(0);
        } else if (event.key === 'End') {
            seek(total());
        } else {
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
