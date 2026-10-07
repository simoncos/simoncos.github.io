"use strict";
(() => {
  // src/ts/lib/dom.ts
  function required(value, name) {
    if (value == null) throw new Error(`Missing required element or value: ${name}`);
    return value;
  }
  function element(id) {
    return required(document.getElementById(id), id);
  }

  // src/ts/music-riddle/map-view.ts
  function createMapView(root, neighborhood, data, songAt, getTrail, flowerFamily, flowers, t) {
    function renderNeighborhood(song) {
      const trail = getTrail();
      const ns = "http://www.w3.org/2000/svg";
      const element2 = (tag, attrs, text) => {
        const node = document.createElementNS(ns, tag);
        for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
        if (text !== void 0) node.textContent = text;
        return node;
      };
      neighborhood.replaceChildren();
      const defs = element2("defs", {});
      for (const side of ["in", "out"]) {
        const marker = element2("marker", { id: "echo-local-arrow-" + side, viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto", markerUnits: "userSpaceOnUse" });
        marker.append(element2("path", { d: "M0 0 L10 5 L0 10 L2 5 Z", class: "echo-focus-arrow-" + side }));
        defs.append(marker);
      }
      neighborhood.append(defs);
      const incoming = data.nodes.filter((n) => trail.edges.includes(n.id + ":" + song.id)).map((n) => n.id);
      if (song.id === data.bonus) incoming.push(data.ending);
      const outgoing = [...song.next];
      if (song.id === data.ending && data.bonus && trail.found.includes(data.bonus)) outgoing.push(data.bonus);
      for (const [side, ids] of [["in", incoming], ["out", outgoing]]) {
        const x = side === "in" ? 42 : 318;
        if (ids.length) neighborhood.append(element2("text", { x: String(x), y: String(Math.max(16, 115 - (ids.length - 1) * 32 - 50)), "text-anchor": "middle", class: "echo-focus-caption" }, side === "in" ? t("FROM", "来路") : t("ONWARD", "出路")));
        ids.forEach((id, i) => {
          const next = songAt(id), found = trail.found.includes(id);
          const y = 115 + (i - (ids.length - 1) / 2) * 64;
          const path = side === "in" ? `M72 ${y} C105 ${y} 107 115 124 115` : `M236 115 C253 115 254 ${y} 286 ${y}`;
          neighborhood.append(element2("path", { d: path, class: "echo-focus-edge echo-focus-edge-" + side + (!found ? " is-pending" : ""), "marker-end": "url(#echo-local-arrow-" + side + ")" }));
          const group = element2("g", { "data-focus-node": id, "data-focus-side": side, class: "echo-focus-node bloom-" + flowerFamily(next) + (found ? " is-found" : ""), transform: `translate(${x} ${y})` });
          group.append(element2("circle", { r: "32", class: "echo-focus-hit" }));
          if (found) {
            group.setAttribute("role", "button");
            group.setAttribute("tabindex", "0");
            group.setAttribute("aria-label", (side === "in" ? t("Back to ", "回到") : t("Continue to ", "继续到")) + next.title);
            group.append(element2("image", { href: "assets/echo-flower-" + next.presentation.flower + ".webp", x: "-20", y: "-20", width: "40", height: "40" }));
          } else {
            group.setAttribute("aria-label", t("Song still to discover", "尚未接上的歌曲"));
            group.append(element2("circle", { r: "15", class: "echo-focus-unknown" }), element2("text", { "text-anchor": "middle", y: "6", class: "echo-focus-question" }, "?"));
          }
          const foreign = element2("foreignObject", { x: "-42", y: "22", width: "84", height: "42" });
          const label2 = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
          label2.className = "echo-focus-label";
          label2.textContent = found ? next.title : t("Not found", "未接上");
          foreign.append(label2);
          group.append(foreign);
          neighborhood.append(group);
        });
      }
      if (!outgoing.length) neighborhood.append(element2("text", { x: "318", y: "120", "text-anchor": "middle", class: "echo-focus-caption" }, song.id === data.ending ? t("ENDING", "终点") : t("END OF PATH", "支线尽头")));
    }
    function renderKeys(song) {
      const trail = getTrail();
      const keys = required(root.querySelector("[data-keys]"), "'[data-keys]'");
      const chord = new Set(song.presentation.chord.midi), heard = /* @__PURE__ */ new Map();
      for (const id of trail.found) if (id !== song.id) for (const note of songAt(id).presentation.chord.midi) heard.set(note, (heard.get(note) || 0) + 1);
      keys.classList.remove(...flowers.map((_, i) => "bloom-" + i));
      keys.classList.add("bloom-" + flowerFamily(song));
      keys.querySelectorAll("[data-midi]").forEach((key) => {
        const note = Number(key.dataset.midi);
        key.classList.toggle("is-chord", chord.has(note));
        key.style.setProperty("--heat", String(Math.min(1, (heard.get(note) || 0) / 6).toFixed(2)));
      });
    }
    return { renderNeighborhood, renderKeys };
  }

  // src/ts/music-riddle/sound.ts
  function createSound(root, soundKey, t, onRenderScore) {
    let soundEnabled = true, soundStatus = "ready";
    try {
      soundEnabled = localStorage.getItem(soundKey) !== "off";
    } catch {
    }
    const piano = typeof EchoPiano === "undefined" ? null : new EchoPiano.Player((status) => {
      soundStatus = status;
      renderSound();
    });
    if (!piano) soundStatus = "unavailable";
    function preparePiano() {
      if (piano && soundEnabled && !document.hidden) void piano.prepare();
    }
    function renderSound() {
      const button = required(root.querySelector("[data-sound]"), "'[data-sound]'");
      button.disabled = soundStatus === "unavailable";
      button.dataset.state = soundStatus === "unavailable" ? "unavailable" : !soundEnabled ? "off" : soundStatus === "loading" ? "loading" : soundStatus === "failed" ? "failed" : "on";
      button.setAttribute("aria-pressed", String(soundEnabled && soundStatus !== "unavailable" && soundStatus !== "failed"));
      button.setAttribute("aria-busy", String(soundStatus === "loading"));
      required(root.querySelector("[data-sound-label]"), "'[data-sound-label]'").textContent = soundStatus === "unavailable" ? t("Sound unavailable", "音效不可用") : !soundEnabled ? t("Sound off", "音效：关") : soundStatus === "loading" ? t("Loading piano…", "加载钢琴…") : soundStatus === "failed" ? t("Retry sound", "重试音效") : t("Sound on", "音效：开");
      button.title = t("A piano chord when you discover or select a song", "发现或点击已点亮的歌曲时，播放钢琴和弦");
      const replay = required(root.querySelector("[data-replay]"), "'[data-replay]'");
      replay.disabled = !soundEnabled || soundStatus === "unavailable";
      onRenderScore();
    }
    function playChord(song) {
      if (!soundEnabled) return;
      if (!song || !piano) return;
      void piano.play(song.presentation.chord.midi);
    }
    return { get enabled() {
      return soundEnabled;
    }, set enabled(value) {
      soundEnabled = value;
    }, get status() {
      return soundStatus;
    }, piano, prepare: preparePiano, render: renderSound, play: playChord };
  }

  // src/ts/lib/data.ts
  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function strings(value) {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
  }
  function finite(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  // src/ts/music-riddle/data.ts
  var label = (value) => isRecord(value) && typeof value.en === "string" && typeof value.zh === "string";
  var openAnswer = (value) => isRecord(value) && typeof value.title === "string" && strings(value.aliases);
  function isSong(value) {
    if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string" || !strings(value.aliases) || !strings(value.next)) return false;
    if (!Array.isArray(value.position) || value.position.length !== 2 || !value.position.every(finite) || !label(value.clue) || !label(value.hint)) return false;
    const presentation = value.presentation;
    if (!isRecord(presentation) || typeof presentation.flower !== "string" || !isRecord(presentation.chord) || !Array.isArray(presentation.chord.midi) || !presentation.chord.midi.every(finite)) return false;
    if (value.dead_ends !== void 0 && !strings(value.dead_ends)) return false;
    if (value.open_answers !== void 0 && (!Array.isArray(value.open_answers) || !value.open_answers.every(openAnswer))) return false;
    if (value.decoys !== void 0 && (!Array.isArray(value.decoys) || !value.decoys.every((item) => openAnswer(item) && isRecord(item) && label(item.message)))) return false;
    return (value.terminal === void 0 || value.terminal === "dead-end" || value.terminal === "epilogue") && (value.quote === void 0 || typeof value.quote === "string") && (value.clue_format === void 0 || value.clue_format === "prose" || value.clue_format === "quote");
  }
  function parseRiddle(value) {
    if (!isRecord(value) || typeof value.id !== "string" || typeof value.start !== "string" || typeof value.ending !== "string" || !Array.isArray(value.nodes) || !value.nodes.length || !value.nodes.every(isSong)) throw new Error("Invalid riddle data");
    const ids = new Set(value.nodes.map((node) => node.id));
    if (ids.size !== value.nodes.length || !ids.has(value.start) || !ids.has(value.ending) || value.bonus !== void 0 && (typeof value.bonus !== "string" || !ids.has(value.bonus)) || value.nodes.some((node) => node.next.some((id) => !ids.has(id)))) throw new Error("Invalid riddle routes");
    if (value.finale !== void 0) {
      const finale = value.finale;
      if (!isRecord(finale) || !finite(finale.beat) || finale.beat <= 0 || !Array.isArray(finale.steps) || !finale.steps.every((step) => isRecord(step) && typeof step.node === "string" && ids.has(step.node) && finite(step.beats) && step.beats > 0 && finite(step.level) && ["roll", "release", "gate", "every"].every((key) => step[key] === void 0 || finite(step[key])) && (step.shape === void 0 || ["up", "down", "bass", "skip"].includes(String(step.shape))))) throw new Error("Invalid finale data");
    }
    return value;
  }

  // src/ts/music-riddle/progress.ts
  var freshTrail = (data) => ({ current: data.start, found: [data.start], edges: [], history: [] });
  function restoreTrail(value, data) {
    const trail = freshTrail(data);
    if (!isRecord(value) || !Array.isArray(value.found) || !Array.isArray(value.edges) || !Array.isArray(value.history)) return trail;
    const ids = new Set(data.nodes.map((node) => node.id));
    const routes = new Set(data.nodes.flatMap((node) => node.next.map((id) => node.id + ":" + id)));
    trail.found = [.../* @__PURE__ */ new Set([data.start, ...value.found.filter((id) => typeof id === "string" && id !== data.start && id !== data.bonus && ids.has(id))])];
    trail.edges = value.edges.filter((edge) => typeof edge === "string" && routes.has(edge) && edge.split(":").every((id) => trail.found.includes(id)));
    if (data.bonus && data.nodes.filter((node) => node.id !== data.bonus).every((node) => trail.found.includes(node.id))) trail.found.push(data.bonus);
    trail.current = typeof value.current === "string" && trail.found.includes(value.current) ? value.current : data.start;
    trail.history = value.history.filter((id) => typeof id === "string" && trail.found.includes(id)).slice(-100);
    return trail;
  }

  // src/ts/music-riddle/answers.ts
  var normalizeAnswer = (value) => value.normalize("NFKC").toLowerCase().replace(/[\s《》「」『』·.,，。!?！？’'"-]/g, "");

  // src/ts/music-riddle.ts
  (function() {
    const rootCandidate = document.querySelector("[data-echo-game]");
    const payloadCandidate = document.getElementById("echo-data");
    if (!rootCandidate || !payloadCandidate) return;
    const root = rootCandidate;
    const payload = payloadCandidate;
    const data = parseRiddle(JSON.parse(payload.textContent || "null")), songs = new Map(data.nodes.map((n) => [n.id, n]));
    function songAt(id) {
      const song = id === void 0 ? void 0 : songs.get(id);
      return required(song, `song ${id}`);
    }
    const flowers = ["poppy", "blue", "ivory", "dahlia"];
    const flowerFamily = (song) => flowers.indexOf(song.presentation.flower);
    const key = "simoncos-" + data.id + "-v1";
    const tip = document.querySelector("[data-device-hint]");
    if (tip) {
      const tipKey = key + "-computer-tip";
      let closed = false;
      try {
        closed = localStorage.getItem(tipKey) === "closed";
      } catch {
      }
      if (closed) tip.hidden = true;
      else {
        tip.classList.add("is-armed");
        tip.querySelector("[data-hint-dismiss]")?.addEventListener("click", () => {
          tip.hidden = true;
          try {
            localStorage.setItem(tipKey, "closed");
          } catch {
          }
          document.getElementById("echo-song")?.focus({ preventScroll: true });
        });
      }
    }
    const t = (en, zh) => window.SITE_SHELL?.lang === "zh" ? zh : en;
    const norm = normalizeAnswer;
    const fresh = () => freshTrail(data);
    let trail = fresh(), storage = true, zoomed = false;
    try {
      trail = restoreTrail(JSON.parse(localStorage.getItem(key) || "null"), data);
      syncBonus();
    } catch {
      try {
        localStorage.removeItem(key);
      } catch {
        storage = false;
      }
    }
    const input = required(document.querySelector("#echo-answer"), "input");
    input.setAttribute("aria-describedby", "echo-feedback");
    const feedback = required(document.getElementById("echo-feedback"), "feedback");
    const announcer = required(document.getElementById("echo-announce"), "announcer");
    const form = required(document.getElementById("echo-form"), "form");
    const hint = required(document.getElementById("echo-hint"), "hint");
    const reveal = required(document.getElementById("echo-reveal"), "reveal");
    const compact = window.matchMedia("(max-width: 900px)");
    const cluePanel = required(root.querySelector(".echo-clue-panel"), "cluePanel");
    const mapPanel = required(root.querySelector(".echo-map-panel"), "mapPanel");
    const mapDialog = required(document.getElementById("echo-map-dialog"), "mapDialog");
    const mapButton = required(root.querySelector("[data-open-map]"), "mapButton");
    const neighborhood = required(root.querySelector("[data-neighborhood]"), "neighborhood");
    const pathButton = required(root.querySelector("[data-path-play]"), "pathButton");
    const pathBeads = required(root.querySelector("[data-path-beads]"), "pathBeads");
    const pathCaption = required(root.querySelector("[data-path-caption]"), "pathCaption");
    const pathRow = required(pathButton.closest("[data-path]"), "path row"), pathHome = required(pathRow.parentElement, "path home"), pathAfter = pathRow.nextSibling;
    function placePath() {
      if (compact.matches) pathHome.insertBefore(pathRow, pathAfter);
      else required(mapPanel.querySelector(".echo-map-stage"), "map stage").before(pathRow);
    }
    placePath();
    compact.addEventListener("change", placePath);
    const finaleButton = required(root.querySelector("[data-finale-play]"), "finaleButton");
    const finaleBar = required(root.querySelector("[data-finale-bar]"), "finaleBar");
    const finaleCaption = required(root.querySelector("[data-finale-caption]"), "finaleCaption");
    const scoreStatus = required(document.getElementById("echo-score-status"), "scoreStatus");
    let mapSelection = false;
    let playing = null;
    let screenLock = null;
    let finaleTimer;
    let misses = 0, feedbackSong = "";
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let mapPagePosition = null;
    function pagePosition() {
      return { x: window.scrollX, y: window.scrollY };
    }
    function restorePage(position) {
      window.scrollTo({ left: position.x, top: position.y, behavior: "instant" });
      window.requestAnimationFrame(() => window.scrollTo({ left: position.x, top: position.y, behavior: "instant" }));
    }
    function closeMap() {
      if (mapDialog.open) mapDialog.close();
    }
    mapDialog.addEventListener("close", () => {
      document.documentElement.classList.remove("echo-map-open");
      if (playing?.kind === "finale") silence();
      if (compact.matches) (mapSelection ? element("echo-song") : mapButton).focus({ preventScroll: true });
      if (compact.matches && mapPagePosition) restorePage(mapPagePosition);
      mapPagePosition = null;
      mapSelection = false;
    });
    required(root.querySelector("[data-close-map]"), "'[data-close-map]'").addEventListener("click", closeMap);
    function openMap() {
      zoomed = false;
      render();
      mapSelection = false;
      mapPagePosition = pagePosition();
      mapDialog.showModal();
      document.documentElement.classList.add("echo-map-open");
    }
    mapButton.addEventListener("click", openMap);
    function syncMapLayout() {
      closeMap();
      if (compact.matches) mapDialog.append(mapPanel);
      else cluePanel.after(mapPanel);
    }
    const fullscreenButton = required(root.querySelector("[data-fullscreen]"), "'[data-fullscreen]'");
    const isFullscreen = () => root.classList.contains("is-fullscreen");
    function setFullscreen(on) {
      if (on === isFullscreen()) return;
      root.classList.toggle("is-fullscreen", on);
      document.documentElement.classList.toggle("echo-fullscreen-open", on);
      render();
      centerCurrentFlower();
    }
    fullscreenButton.addEventListener("click", () => {
      if (isFullscreen()) {
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {
        });
        setFullscreen(false);
        return;
      }
      setFullscreen(true);
      if (root.requestFullscreen) void root.requestFullscreen({ navigationUI: "hide" }).catch(() => {
      });
    });
    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement) setFullscreen(false);
    });
    compact.addEventListener("change", () => {
      if (compact.matches) {
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {
        });
        setFullscreen(false);
      }
      syncMapLayout();
      render();
      centerCurrentFlower();
    });
    syncMapLayout();
    let notice = () => "";
    let feedbackKind = "";
    const soundKey = key + "-sound";
    const sound = createSound(root, soundKey, t, () => renderScore());
    const preparePiano = sound.prepare, renderSound = sound.render;
    const playChord = (id) => {
      if (!sound.enabled || !sound.piano) return;
      sound.play(songAt(id));
      if (playing) finishScore(playing, false);
    };
    let viewHeight = window.innerHeight, tallest = viewHeight;
    window.addEventListener("resize", () => {
      const shrank = window.innerHeight < viewHeight;
      viewHeight = window.innerHeight;
      tallest = Math.max(tallest, viewHeight);
      if (!shrank || tallest - viewHeight < 150 || !compact.matches || document.activeElement !== input) return;
      window.requestAnimationFrame(() => window.scrollBy({ top: input.getBoundingClientRect().bottom - (window.innerHeight - 12), behavior: "instant" }));
    });
    function focusClue() {
      required(document.getElementById("echo-song"), "'echo-song'").focus({ preventScroll: true });
    }
    function bringClueIntoView() {
      let steered = false, gliding = false;
      const release = () => {
        window.removeEventListener("touchstart", steer);
        window.removeEventListener("wheel", steer);
      };
      function steer() {
        steered = true;
        if (gliding) window.scrollTo({ left: window.scrollX, top: window.scrollY, behavior: "instant" });
        release();
      }
      window.addEventListener("touchstart", steer, { passive: true });
      window.addEventListener("wheel", steer, { passive: true });
      window.setTimeout(() => {
        const heading = required(document.getElementById("echo-song"), "'echo-song'"), top = heading.getBoundingClientRect().top;
        if (steered || top >= (parseFloat(getComputedStyle(heading).scrollMarginTop) || 0) - 4 && top < window.innerHeight * 0.5) {
          release();
          return;
        }
        gliding = true;
        heading.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        window.setTimeout(release, 900);
      }, 500);
    }
    function focusAfterAnswer() {
      if (finePointer.matches && !form.hidden) {
        input.focus({ preventScroll: true });
        return;
      }
      focusClue();
      bringClueIntoView();
    }
    function ring(id, flower = true) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const targets = [root.querySelector(`[data-node="${id}"]`), flower ? root.querySelector("[data-clue-flower]") : null, root.querySelector("[data-keys]")];
      for (const target of targets) {
        if (!target) continue;
        target.classList.remove("is-ringing");
        void target.getBoundingClientRect();
        target.classList.add("is-ringing");
      }
      window.clearTimeout(ringTimer);
      ringTimer = window.setTimeout(() => root.querySelectorAll(".is-ringing").forEach((node) => node.classList.remove("is-ringing")), 1900);
    }
    let ringTimer;
    function centerCurrentFlower() {
      if (!zoomed || compact.matches && !mapDialog.open) return;
      const stage = required(root.querySelector(".echo-map-stage"), "'.echo-map-stage'");
      const current = required(root.querySelector(".echo-node.is-current .echo-hit"), "'.echo-node.is-current .echo-hit'").getBoundingClientRect(), box = stage.getBoundingClientRect();
      const visibleTop = Math.max(box.top, 0);
      const visibleBottom = Math.min(box.bottom, window.innerHeight);
      const centerY = visibleBottom - visibleTop > 100 ? (visibleTop + visibleBottom) / 2 : box.top + stage.clientHeight / 2;
      stage.scrollLeft += current.left + current.width / 2 - box.left - stage.clientWidth / 2;
      stage.scrollTop += current.top + current.height / 2 - centerY;
    }
    function syncBonus() {
      if (!data.bonus) return false;
      const complete = data.nodes.filter((n) => n.id !== data.bonus).every((n) => trail.found.includes(n.id));
      if (complete && !trail.found.includes(data.bonus)) {
        trail.found.push(data.bonus);
        return true;
      }
      return false;
    }
    function save() {
      try {
        localStorage.setItem(key, JSON.stringify(trail));
      } catch {
        storage = false;
      }
    }
    let arrivalTimer;
    function clearArrival() {
      window.clearTimeout(arrivalTimer);
      root.classList.remove("is-loop-arrival", "is-ending-arrival", "is-song-arrival");
      root.querySelectorAll(".is-new").forEach((node) => node.classList.remove("is-new"));
      if (!playing) required(root.querySelector("[data-travel-glow]"), "'[data-travel-glow]'").removeAttribute("d");
    }
    function animateArrival(kind, previous, id, isNew, bonus) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const path = Array.from(root.querySelectorAll("[data-from]")).find((edge) => edge.dataset.from === previous && edge.dataset.to === id);
      if (path) required(root.querySelector("[data-travel-glow]"), "'[data-travel-glow]'").setAttribute("d", path.getAttribute("d") || "");
      root.querySelectorAll("[data-node]").forEach((node) => {
        if (isNew && (node.dataset.node || "") === id || bonus && (node.dataset.node || "") === data.bonus) node.classList.add("is-new");
      });
      void root.offsetWidth;
      root.classList.add("is-" + kind + "-arrival");
      arrivalTimer = window.setTimeout(clearArrival, 2800);
    }
    function visit(id, remember = true, center = true, preservePage = true) {
      if (!trail.found.includes(id)) return;
      const position = compact.matches && preservePage ? pagePosition() : null;
      window.clearTimeout(finaleTimer);
      playChord(id);
      clearArrival();
      misses = 0;
      if (remember && trail.current !== id) trail.history.push(trail.current);
      trail.history = trail.history.slice(-100);
      trail.current = id;
      input.value = "";
      notice = () => "";
      feedbackKind = "";
      hint.open = false;
      reveal.open = false;
      save();
      render();
      if (center) centerCurrentFlower();
      ring(id);
      if (position) restorePage(position);
    }
    function solve(id) {
      const previous = songAt(trail.current);
      if (!previous.next.includes(id)) return;
      const edge = previous.id + ":" + id;
      const walked = trail.edges.indexOf(edge);
      if (walked >= 0) trail.edges.splice(walked, 1);
      trail.edges.push(edge);
      const isNew = !trail.found.includes(id);
      if (isNew) trail.found.push(id);
      const unlocked = syncBonus();
      visit(id);
      const arrival = id === data.ending ? "ending" : id === data.start && previous.id !== data.start ? "loop" : null;
      const lit = trail.found.filter((song) => song !== data.bonus).length, total = data.nodes.length - (data.bonus ? 1 : 0);
      const finaleSoon = unlocked && sound.enabled && !!data.finale;
      notice = () => unlocked ? finaleSoon ? t("Every song is lit. A hidden echo has appeared beside the ending, and the finale is about to begin.", "所有歌曲都已点亮。终点旁出现了一段隐藏的回响，终章即将奏响。") : t("Every song is lit. A hidden echo has appeared beside the ending.", "所有歌曲都已点亮。终点旁出现了一段隐藏的回响。") : arrival === "loop" ? t("Back to the beginning. Your trail remains.", "又回到最初。走过的路还在。") : t("Found: ", "找到了：") + songAt(id).title + (id === data.ending ? t(" · The ending.", " · 终点。") : isNew ? ` · ${lit} / ${total}` : "");
      feedbackKind = "success";
      feedbackSong = id;
      render();
      animateArrival(arrival || "song", previous.id, id, isNew, unlocked);
      if (finaleSoon) finaleTimer = window.setTimeout(() => startFinale(), 2900);
      focusAfterAnswer();
      if (finePointer.matches && !form.hidden) {
        announcer.textContent = "";
        window.setTimeout(() => {
          announcer.textContent = t(songAt(id).clue.en, songAt(id).clue.zh);
        }, 60);
      }
    }
    function acknowledgeOpen(answer) {
      notice = () => t(
        `You found ${answer.title}. Its next clue is still blank; explore another branch for now.`,
        `接上了《${answer.title}》。后续谜面暂空，可以先探索其他分支。`
      );
      input.value = "";
      feedbackKind = "success";
      render();
    }
    const { renderNeighborhood, renderKeys } = createMapView(root, neighborhood, data, songAt, () => trail, flowerFamily, flowers, t);
    const midiOf = (id) => songAt(id).presentation.chord.midi;
    const songCount = data.nodes.length - (data.bonus ? 1 : 0);
    const finaleStatus = required(finaleBar.querySelector("[data-finale-status]"), "finale status");
    const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let beadsFor = "";
    const scoring = typeof EchoScore !== "undefined";
    function walkedRoute() {
      if (!scoring) return [];
      return EchoScore.route(trail.edges, data.start, trail.current, data.ending, data.bonus);
    }
    function finaleReady() {
      return scoring && !!data.finale && !!data.bonus && trail.found.includes(data.bonus);
    }
    function say(region, text) {
      region.textContent = "";
      window.setTimeout(() => {
        region.textContent = text;
      }, 60);
    }
    function placeSpotlight(id) {
      const spot = required(root.querySelector("[data-spotlight]"), "'[data-spotlight]'"), at = songAt(id).position;
      spot.style.transform = `translate(${at[0]}px,${at[1]}px)`;
    }
    function travel(from, to, pulse) {
      const glow = required(root.querySelector("[data-travel-glow]"), "'[data-travel-glow]'");
      glow.classList.remove("is-traveling");
      root.querySelectorAll(".echo-route.is-lit").forEach((route) => route.classList.remove("is-lit"));
      if (!from) return;
      const edgeCandidate = Array.from(root.querySelectorAll("[data-from]")).find((path) => path.dataset.from === from && path.dataset.to === to);
      if (!edgeCandidate) return;
      const edge = edgeCandidate;
      if (!pulse) {
        required(edge.parentElement, "edge parent").classList.add("is-lit");
        return;
      }
      if (reducedMotion()) return;
      glow.setAttribute("d", edge.getAttribute("d") || "");
      void glow.getBoundingClientRect();
      glow.classList.add("is-traveling");
    }
    function showMap() {
      if (compact.matches) {
        if (!mapDialog.open) openMap();
        return;
      }
      if (zoomed) {
        zoomed = false;
        render();
      }
      const bar = finaleBar.getBoundingClientRect(), stage = required(root.querySelector(".echo-map-stage"), "'.echo-map-stage'").getBoundingClientRect();
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hdr-h")) || 76;
      if (!isFullscreen() && (bar.top < header || stage.bottom > window.innerHeight)) finaleBar.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
    }
    function light(run, index) {
      const id = run.ids[index];
      run.lit = id;
      root.querySelectorAll(".is-sounding").forEach((element2) => element2.classList.remove("is-sounding"));
      root.querySelector(`[data-node="${id}"]`)?.classList.add("is-sounding");
      root.querySelector(`[data-aura="${id}"]`)?.classList.add("is-sounding");
      placeSpotlight(id);
      renderKeys(songAt(id));
      ring(id, false);
      travel(index ? run.ids[index - 1] : "", id, run.kind === "path");
      const title = songAt(id).title;
      if (run.kind === "path") {
        pathBeads.querySelectorAll("li").forEach((bead, i) => {
          bead.classList.toggle("is-lit", i === index);
          bead.classList.toggle("is-played", i < index);
        });
        pathCaption.textContent = title;
      } else {
        finaleCaption.textContent = title;
        if (index === run.ids.length - 1) {
          root.querySelector(`[data-node="${id}"]`)?.classList.add("is-new");
          root.classList.add("is-finale-bloom");
        }
      }
    }
    function enter(run) {
      run.started = true;
      if (run.kind === "finale") {
        showMap();
        root.classList.add("is-finale");
        finaleBar.style.setProperty("--run", run.seconds.toFixed(1) + "s");
        finaleBar.style.setProperty("--lead", (run.lead + 0.08).toFixed(2) + "s");
        say(finaleStatus, t("The finale begins. Press Escape to stop.", "终章开始。按 Esc 可停止。"));
      } else say(scoreStatus, t(`Playing the path: ${run.ids.length} songs.`, `播放这条路径：${run.ids.length} 首歌。`));
      renderScore();
    }
    function finishScore(run, finished) {
      if (playing !== run) return;
      playing = null;
      if (run.kind === "finale") releaseScreen();
      root.classList.remove("is-finale", "is-finale-bloom");
      root.querySelectorAll(".is-sounding").forEach((element2) => element2.classList.remove("is-sounding"));
      root.querySelector(".echo-node.is-new")?.classList.remove("is-new");
      const glow = required(root.querySelector("[data-travel-glow]"), "'[data-travel-glow]'");
      glow.classList.remove("is-traveling");
      glow.removeAttribute("d");
      root.querySelectorAll(".echo-route.is-lit").forEach((route) => route.classList.remove("is-lit"));
      pathBeads.querySelectorAll("li").forEach((bead) => bead.classList.remove("is-lit", "is-played"));
      placeSpotlight(trail.current);
      renderKeys(songAt(trail.current));
      renderScore();
      if (finished) say(run.kind === "finale" ? finaleStatus : scoreStatus, run.kind === "finale" ? t("The finale has ended.", "终章播放完毕。") : t("Path finished.", "路径播放完毕。"));
    }
    function silence() {
      const run = playing;
      sound.piano?.stop();
      if (run) finishScore(run, false);
    }
    function holdScreen(run) {
      if (!navigator.wakeLock) return;
      navigator.wakeLock.request("screen").then((lock) => {
        if (playing !== run || screenLock) {
          void lock.release().catch(() => {
          });
          return;
        }
        screenLock = lock;
        lock.addEventListener("release", () => {
          if (screenLock === lock) screenLock = null;
        });
      }).catch(() => {
      });
    }
    function releaseScreen() {
      const lock = screenLock;
      screenLock = null;
      if (lock) void lock.release().catch(() => {
      });
    }
    function begin(kind, ids, steps, lead) {
      window.clearTimeout(finaleTimer);
      if (!sound.piano || !scoring) return;
      if (playing) finishScore(playing, false);
      const run = { kind, ids, started: false, lit: "", lead, seconds: EchoScore.length(steps) };
      playing = run;
      if (kind === "finale") holdScreen(run);
      renderScore();
      void sound.piano.playScore(steps, {
        onStart: () => {
          if (playing === run) enter(run);
        },
        onStep: (index) => {
          if (playing === run) light(run, index);
        },
        onEnd: (finished) => finishScore(run, finished)
      }, { lead }).then(() => finishScore(run, false));
    }
    function startFinale(lead = 0.7) {
      window.clearTimeout(finaleTimer);
      if (!data.finale || !finaleReady() || !sound.enabled || sound.status === "unavailable" || document.hidden) return;
      begin("finale", data.finale.steps.map((step) => step.node), EchoScore.finaleSteps(data.finale, midiOf), lead);
    }
    function renderScore() {
      const canPlay = sound.enabled && sound.status !== "unavailable";
      const path = playing?.kind === "path" ? playing : null, finale = playing?.kind === "finale" ? playing : null;
      const route = path ? path.ids : walkedRoute(), row = required(pathBeads.parentElement, "path row");
      row.hidden = route.length < 2;
      if (route.length > 1) {
        const key2 = route.join(">");
        if (key2 !== beadsFor) {
          beadsFor = key2;
          pathBeads.replaceChildren(...route.map((id) => {
            const bead = document.createElement("li");
            bead.className = "bloom-" + flowerFamily(songAt(id));
            return bead;
          }));
        }
        const seconds = Math.max(1, Math.round(EchoScore.length(EchoScore.pathSteps(route, midiOf))));
        row.dataset.state = path ? "playing" : "idle";
        pathButton.disabled = !path && !canPlay;
        required(root.querySelector("[data-path-icon]"), "'[data-path-icon]'").textContent = path ? "■" : "▶";
        required(root.querySelector("[data-path-label]"), "'[data-path-label]'").textContent = path ? t("Stop", "停止") : t("Play this path", "回响这条路");
        pathCaption.textContent = path ? path.started ? songAt(path.lit || route[0]).title : t("Loading piano…", "加载钢琴…") : !canPlay ? t("Turn sound on to play", "打开音效后可播放") : t(`${route.length} songs · about ${seconds} s`, `${route.length} 首 · 约 ${seconds} 秒`);
      }
      finaleBar.hidden = !finaleReady();
      if (finaleReady()) {
        finaleBar.classList.toggle("is-playing", !!finale);
        finaleBar.classList.toggle("is-running", !!finale?.started);
        finaleButton.disabled = !finale && !canPlay;
        required(finaleBar.querySelector("[data-finale-icon]"), "'[data-finale-icon]'").textContent = finale ? "■" : "▶";
        required(finaleBar.querySelector("[data-finale-label]"), "'[data-finale-label]'").textContent = finale ? t("Stop", "停止") : t("Play the finale", "播放终章");
        finaleCaption.textContent = finale ? finale.started ? songAt(finale.lit || finale.ids[0]).title : t("Loading piano…", "加载钢琴…") : !canPlay ? t("Turn sound on to play the finale", "打开音效后可播放终章") : t(`Finale · all ${songCount} songs as one piece`, `终章 · ${songCount} 首歌，编成一段和弦曲`);
      }
    }
    pathButton.addEventListener("click", () => {
      if (playing?.kind === "path") {
        silence();
        return;
      }
      const ids = walkedRoute();
      if (ids.length > 1 && sound.enabled) begin("path", ids, EchoScore.pathSteps(ids, midiOf), 0);
    });
    finaleButton.addEventListener("click", () => {
      if (playing?.kind === "finale") {
        silence();
        return;
      }
      startFinale();
    });
    function followNeighbor(target) {
      const node = target.closest("[data-focus-node]");
      if (!node || !trail.found.includes(node.dataset.focusNode || "")) return;
      const id = node.dataset.focusNode || "";
      if (node.dataset.focusSide === "out" && songAt(trail.current).next.includes(id)) solve(id);
      else {
        visit(id);
        focusClue();
      }
    }
    neighborhood.addEventListener("click", (event) => followNeighbor(event.target));
    neighborhood.addEventListener("keydown", (event) => {
      if (!event.repeat && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        followNeighbor(event.target);
      }
    });
    function render() {
      const song = songAt(trail.current), ending = song.id === data.ending, deadEnd = song.terminal === "dead-end", epilogue = song.id === data.bonus;
      const heading = required(document.getElementById("echo-song"), "'echo-song'");
      heading.textContent = song.title;
      heading.tabIndex = -1;
      required(root.querySelector("[data-now-label]"), "'[data-now-label]'").textContent = compact.matches ? song.title : t("NOW ECHOING", "正在回响");
      const family = flowerFamily(song);
      const emblem = required(root.querySelector("[data-clue-flower]"), "'[data-clue-flower]'");
      emblem.classList.remove(...flowers.map((_, i) => "bloom-" + i));
      emblem.classList.add("bloom-" + family);
      cluePanel.classList.remove(...flowers.map((_, i) => "bloom-" + i));
      cluePanel.classList.add("bloom-" + family);
      required(root.querySelector("[data-clue-art]"), "'[data-clue-art]'").src = "assets/echo-flower-" + song.presentation.flower + ".webp";
      const quote = required(document.getElementById("echo-quote"), "'echo-quote'");
      const quotedClue = song.clue_format === "quote";
      const quoteText = quotedClue ? t(song.clue.en, song.clue.zh) : song.quote;
      quote.replaceChildren(...(quoteText?.match(/[^，]+，?/g) || []).map((line) => {
        const span = document.createElement("span");
        span.textContent = line;
        return span;
      }));
      quote.hidden = !quoteText;
      quote.lang = quotedClue ? t("en", "zh-Hans") : "zh-Hans";
      const clue = required(document.getElementById("echo-clue"), "'echo-clue'");
      clue.textContent = t(song.clue.en, song.clue.zh);
      clue.hidden = quotedClue;
      renderNeighborhood(song);
      renderKeys(playing?.lit ? songAt(playing.lit) : song);
      const remaining = song.next.filter((id) => !trail.edges.includes(song.id + ":" + id)).length;
      const total = song.next.length, explored = total - remaining;
      let branch = epilogue ? t("A HIDDEN ECHO · THANK YOU FOR LISTENING", "隐藏回响 · 谢谢你听到这里") : deadEnd ? t("DEAD END · EXPLORE ANOTHER BRANCH", "死胡同 · 换一条路继续") : ending ? t("ENDING FOUND", "已抵达终点") : total ? remaining ? t(`${total} outgoing ${total === 1 ? "path" : "paths"} · ${explored} explored`, `下一步 ${total} 条 · 已走通 ${explored} 条`) : t(`${total} outgoing ${total === 1 ? "path" : "paths"} · all explored`, `下一步 ${total} 条 · 已全部走通`) : t("Guess this side branch, then return to another song.", "猜猜这条支线，再回到其他歌继续。");
      if (song.open_answers?.length) branch += "\n" + t(`${song.open_answers.length} answer has no next clue yet`, `另有 ${song.open_answers.length} 个答案，后续暂空`);
      required(document.getElementById("echo-branch"), "'echo-branch'").textContent = branch;
      required(document.getElementById("echo-pips"), "'echo-pips'").replaceChildren(...song.next.map((id) => {
        const pip = document.createElement("i");
        pip.className = trail.edges.includes(song.id + ":" + id) ? "is-walked" : "";
        return pip;
      }));
      form.hidden = ending || deadEnd || epilogue;
      required(document.getElementById("echo-dead-end"), "'echo-dead-end'").hidden = !(deadEnd || epilogue);
      required(document.getElementById("echo-ending"), "'echo-ending'").hidden = !ending;
      required(document.querySelector(".echo-help"), "'.echo-help'").hidden = ending || deadEnd || epilogue;
      required(document.querySelector("[data-back]"), "'[data-back]'").disabled = !trail.history.length;
      feedback.textContent = notice();
      feedback.dataset.kind = feedbackKind;
      feedback.classList.remove(...flowers.map((_, i) => "bloom-" + i));
      if (feedbackKind === "success" && songs.has(feedbackSong)) feedback.classList.add("bloom-" + flowerFamily(songAt(feedbackSong)));
      required(document.querySelector("#echo-hint summary"), "'#echo-hint summary'").classList.toggle("is-nudged", misses >= 2 && !hint.open);
      input.setAttribute("aria-invalid", String(feedbackKind === "error"));
      renderSound();
      required(document.getElementById("echo-hint-text"), "'echo-hint-text'").textContent = t(song.hint.en, song.hint.zh);
      const choices = required(document.getElementById("echo-reveal-choices"), "'echo-reveal-choices'");
      choices.replaceChildren();
      if (reveal.open) {
        if (song.next.length) for (const id of song.next) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = songAt(id).title + " →";
          button.addEventListener("click", () => solve(id));
          choices.append(button);
        }
        else if (song.dead_ends?.length) {
          const p = document.createElement("p");
          p.textContent = t("This side branch has no further clue here: ", "这条支线在这里没有后续谜面：") + song.dead_ends[0];
          choices.append(p);
        }
        for (const answer of song.open_answers || []) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = answer.title + t(" · next clue pending", " · 后续待补");
          button.addEventListener("click", () => acknowledgeOpen(answer));
          choices.append(button);
        }
      }
      const list = required(document.getElementById("echo-song-list"), "'echo-song-list'");
      list.replaceChildren(...trail.found.map((id) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = songAt(id).title;
        button.setAttribute("aria-current", String(id === song.id));
        button.className = "bloom-" + flowerFamily(songAt(id));
        button.addEventListener("click", () => {
          visit(id, true, true, false);
          if (compact.matches) cluePanel.scrollIntoView({ block: "start", behavior: "instant" });
          focusClue();
        });
        return button;
      }));
      const foundCount = trail.found.filter((id) => id !== data.bonus).length;
      required(root.querySelector("[data-focus-count]"), "'[data-focus-count]'").textContent = t(`${foundCount} / ${data.nodes.length - (data.bonus ? 1 : 0)} songs found`, `${foundCount} / ${data.nodes.length - (data.bonus ? 1 : 0)} 首已点亮`);
      required(document.getElementById("echo-found-count"), "'echo-found-count'").textContent = String(foundCount);
      document.getElementById("echo-progress-bar").value = foundCount;
      const bonusUnlocked = !!data.bonus && trail.found.includes(data.bonus);
      required(document.getElementById("echo-bonus"), "'echo-bonus'").hidden = !bonusUnlocked;
      root.querySelector("[data-bonus-link]")?.classList.toggle("is-hidden", !bonusUnlocked);
      root.classList.toggle("is-map-zoomed", zoomed);
      const zoomButton = required(root.querySelector("[data-map-zoom]"), "'[data-map-zoom]'");
      zoomButton.textContent = zoomed ? t("See full map", "查看全图") : t("Enlarge map", "放大地图");
      zoomButton.setAttribute("aria-pressed", String(zoomed));
      fullscreenButton.setAttribute("aria-pressed", String(isFullscreen()));
      required(fullscreenButton.querySelector("[data-fullscreen-label]"), "'[data-fullscreen-label]'").textContent = isFullscreen() ? t("Exit full screen", "退出全屏") : t("Full screen", "全屏");
      required(root.querySelector(".echo-map-instruction"), "'.echo-map-instruction'").textContent = compact.matches ? zoomed ? t("Scroll to explore · select a lit song to return to its clue", "滑动查看 · 选择已点亮的歌，回到它的线索") : t("Full network · enlarge to explore the details", "完整网络 · 放大查看细节") : zoomed ? t("Scroll to explore · tap a lit song to select and replay", "滑动查看 · 点已点亮的歌曲，切换并回放") : t("Tap a lit song to select and replay", "点已点亮的歌曲，切换并回放");
      required(document.getElementById("echo-save-status"), "'echo-save-status'").textContent = storage ? t("Saved in this browser", "进度已保存在此浏览器") : t("Saving unavailable · progress lasts while this page is open", "无法保存 · 进度仅在此页面打开时保留");
      root.querySelectorAll("[data-node]").forEach((node) => {
        const id = node.dataset.node || "", found = trail.found.includes(id), active = id === song.id;
        node.classList.toggle("is-hidden", id === data.bonus && !bonusUnlocked);
        node.setAttribute("aria-hidden", String(id === data.bonus && !bonusUnlocked));
        const kind = node.querySelector(".echo-node-kind");
        if (kind) kind.textContent = id === data.start ? t("START", "起点") : t("ENDING", "终点");
        node.classList.toggle("is-found", found);
        node.classList.toggle("is-current", active);
        required(node.querySelector("text"), "'text'").textContent = found ? songAt(id).title : String(data.nodes.findIndex((n) => n.id === id) + 1).padStart(2, "0");
        if (found) {
          node.setAttribute("role", "button");
          node.setAttribute("tabindex", "0");
          node.setAttribute("aria-label", t("Revisit ", "重新打开") + songAt(id).title);
          node.setAttribute("aria-pressed", String(active));
        } else {
          node.removeAttribute("role");
          node.removeAttribute("tabindex");
          node.removeAttribute("aria-label");
          node.removeAttribute("aria-pressed");
        }
      });
      const relatedRoutes = [], walkedRoutes = [];
      root.querySelectorAll("[data-from]").forEach((edge) => {
        const found = trail.edges.includes(edge.dataset.from + ":" + edge.dataset.to);
        const outgoing = edge.dataset.from === song.id, incoming = edge.dataset.to === song.id;
        edge.classList.toggle("is-found", found);
        edge.classList.toggle("is-current", found && outgoing);
        edge.classList.toggle("is-next", !found && outgoing);
        edge.classList.toggle("is-incoming", incoming);
        edge.setAttribute("marker-end", "url(#echo-arrow" + (outgoing ? "-active" : incoming ? "-incoming" : found ? "-walked" : "") + ")");
        const route = edge.parentElement;
        required(route.querySelector(".echo-edge-glow"), "'.echo-edge-glow'").classList.toggle("is-found", found);
        const related = outgoing || incoming;
        route.classList.toggle("is-related", related);
        if (related) relatedRoutes.push(route);
        else if (found) walkedRoutes.push(route);
      });
      root.querySelectorAll("[data-aura]").forEach((aura) => aura.classList.toggle("is-found", trail.found.includes(aura.dataset.aura || "") && ((aura.dataset.aura || "") !== data.bonus || bonusUnlocked)));
      const lit = trail.found.length;
      root.style.setProperty("--echo-aura-k", lit <= 22 ? "1" : lit <= 27 ? ".85" : lit <= 32 ? ".72" : ".6");
      placeSpotlight(playing?.lit || trail.current);
      relatedRoutes.sort((a, b) => Number(required(a.querySelector("[data-from]"), "'[data-from]'").dataset.from === song.id) - Number(required(b.querySelector("[data-from]"), "'[data-from]'").dataset.from === song.id));
      const layer = required(root.querySelector("[data-aura-layer]"), "'[data-aura-layer]'");
      for (const route of [...walkedRoutes, ...relatedRoutes]) layer.before(route);
    }
    required(document.getElementById("echo-form"), "'echo-form'").addEventListener("submit", (event) => {
      event.preventDefault();
      const guessCandidate = norm(input.value), song = songAt(trail.current);
      if (!guessCandidate) return;
      const guess = guessCandidate;
      const answer = song.next.find((id) => [songAt(id).title, ...songAt(id).aliases].some((answer2) => norm(answer2) === guess));
      if (answer) {
        solve(answer);
        return;
      }
      const openAnswer2 = song.open_answers?.find((answer2) => [answer2.title, ...answer2.aliases].some((value) => norm(value) === guess));
      if (openAnswer2) {
        acknowledgeOpen(openAnswer2);
        return;
      }
      const decoy = song.decoys?.find((item) => [item.title, ...item.aliases].some((value) => norm(value) === guess));
      if (decoy) {
        notice = () => t(decoy.message.en, decoy.message.zh);
        feedbackKind = "near";
        render();
        input.select();
        return;
      }
      if (song.dead_ends?.some((n) => norm(n) === guess)) notice = () => t("You found a side branch with no next clue here; revisit another song below.", "你接上了一条支线。这里没有下一条谜面，可以在下方回到其他歌。");
      else {
        misses++;
        notice = () => t("That song doesn’t follow this clue. Try another, or open a hint.", "这首歌没有接上当前线索。可以再试一首，或打开提示。");
      }
      feedbackKind = "error";
      render();
      input.select();
      const row = required(input.parentElement, "answer row");
      row.classList.remove("is-shaking");
      void row.offsetWidth;
      row.classList.add("is-shaking");
    });
    required(document.querySelector("[data-back]"), "'[data-back]'").addEventListener("click", () => {
      const id = trail.history.pop();
      if (id) visit(id, false);
    });
    required(document.querySelector("[data-open-bonus]"), "'[data-open-bonus]'").addEventListener("click", () => {
      if (data.bonus) {
        visit(data.bonus);
        if (compact.matches && mapDialog.open) {
          mapSelection = true;
          closeMap();
        }
        focusClue();
      }
    });
    required(document.querySelector("[data-return-branch]"), "'[data-return-branch]'").addEventListener("click", () => {
      const id = trail.history.pop() || data.nodes.find((n) => n.next.includes(trail.current))?.id || data.start;
      visit(id, false);
    });
    required(document.querySelector("[data-go-start]"), "'[data-go-start]'").addEventListener("click", () => visit(data.start));
    required(document.querySelector("[data-reset]"), "'[data-reset]'").addEventListener("click", () => {
      window.clearTimeout(finaleTimer);
      silence();
      clearArrival();
      trail = fresh();
      misses = 0;
      notice = () => "";
      feedbackKind = "";
      hint.open = false;
      reveal.open = false;
      input.value = "";
      required(document.querySelector(".echo-reset"), "'.echo-reset'").open = false;
      save();
      render();
    });
    hint.addEventListener("toggle", () => {
      if (hint.open) {
        reveal.open = false;
        required(hint.querySelector("summary"), "'summary'").classList.remove("is-nudged");
      }
    });
    reveal.addEventListener("toggle", () => {
      if (reveal.open) hint.open = false;
      render();
    });
    required(root.querySelector("[data-sound]"), "'[data-sound]'").addEventListener("click", () => {
      sound.enabled = sound.status === "failed" ? true : !sound.enabled;
      if (sound.enabled) {
        playChord(trail.current);
        preparePiano();
      } else silence();
      try {
        localStorage.setItem(soundKey, sound.enabled ? "on" : "off");
      } catch {
      }
      renderSound();
    });
    required(root.querySelector("[data-replay]"), "'[data-replay]'").addEventListener("click", () => {
      playChord(trail.current);
      ring(trail.current);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) silence();
      else preparePiano();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (playing) silence();
      else if (isFullscreen() && !document.fullscreenElement && !mapDialog.open) setFullscreen(false);
    });
    required(root.querySelector("[data-map-zoom]"), "'[data-map-zoom]'").addEventListener("click", () => {
      zoomed = !zoomed;
      render();
      centerCurrentFlower();
    });
    required(root.querySelector("[data-map-locate]"), "'[data-map-locate]'").addEventListener("click", () => {
      zoomed = true;
      render();
      centerCurrentFlower();
    });
    root.querySelectorAll("[data-node]").forEach((node) => {
      const select = () => {
        if (!trail.found.includes(node.dataset.node || "")) return;
        visit(node.dataset.node || "", true, false);
        if (compact.matches) {
          mapSelection = true;
          closeMap();
        }
      };
      node.addEventListener("click", select);
      node.addEventListener("keydown", (event) => {
        if (!event.repeat && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          select();
        }
      });
    });
    window.SITE_SHELL?.onLang?.(render);
    syncBonus();
    save();
    render();
    centerCurrentFlower();
    preparePiano();
  })();
})();
