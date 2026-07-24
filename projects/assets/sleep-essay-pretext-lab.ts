import {
  layoutNextLine,
  prepareWithSegments,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from "./vendor/pretext/layout.js";

type LensPreset = {
  label: string;
  note: string;
  fx: number;
  fy: number;
  color: string;
};

type PositionedLine = {
  text: string;
  x: number;
  y: number;
};

type Size = {
  width: number;
  height: number;
};

type DragState = {
  pointerId: number;
  moved: boolean;
  startX: number;
  startY: number;
  orbX: number;
  orbY: number;
};

const labs = document.querySelectorAll<HTMLElement>("[data-pretext-lab]");

labs.forEach((lab) => {
  const stage = lab.querySelector<HTMLElement>("[data-pretext-stage]");
  const source = lab.querySelector<HTMLElement>("[data-pretext-source]");
  const linesLayer = lab.querySelector<HTMLElement>("[data-pretext-lines]");
  const orb = lab.querySelector<HTMLButtonElement>("[data-pretext-orb]");
  const orbLabel = lab.querySelector<HTMLElement>("[data-pretext-orb-label]");
  const orbNote = lab.querySelector<HTMLElement>("[data-pretext-orb-note]");
  const motionToggle = lab.querySelector<HTMLButtonElement>("[data-pretext-motion-toggle]");
  const presetButtons = Array.from(
    lab.querySelectorAll<HTMLButtonElement>("[data-pretext-preset]"),
  );

  if (
    !stage ||
    !source ||
    !linesLayer ||
    !orb ||
    !orbLabel ||
    !orbNote ||
    !motionToggle ||
    presetButtons.length === 0
  ) {
    return;
  }

  const isChinese = document.documentElement.lang.startsWith("zh");
  const presets: LensPreset[] = isChinese
    ? [
        { label: "节律", note: "入睡时间", fx: 0.2, fy: 0.42, color: "#7ce2ff" },
        { label: "呼吸", note: "打呼 / BD", fx: 0.8, fy: 0.34, color: "#bc8cff" },
        { label: "情境", note: "旅行 / 疲劳", fx: 0.72, fy: 0.66, color: "#ffa657" },
        { label: "感受", note: "真实早晨", fx: 0.42, fy: 0.7, color: "#3fb950" },
      ]
    : [
        { label: "Rhythm", note: "Bedtime", fx: 0.2, fy: 0.42, color: "#7ce2ff" },
        { label: "Breathing", note: "Snoring / BD", fx: 0.8, fy: 0.34, color: "#bc8cff" },
        { label: "Context", note: "Travel / fatigue", fx: 0.72, fy: 0.66, color: "#ffa657" },
        { label: "Feeling", note: "The lived morning", fx: 0.42, fy: 0.7, color: "#3fb950" },
      ];

  const rawText = source.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (!rawText) return;

  const fontFamily = isChinese ? '"Noto Sans SC"' : '"Inter"';
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const linePool: HTMLSpanElement[] = [];
  let prepared: PreparedTextWithSegments | null = null;
  let preparedFontSize = 0;
  let size: Size = { width: 0, height: 0 };
  let selectedPreset = 0;
  let orbX = 0;
  let orbY = 0;
  let drag: DragState | null = null;
  let autoMotion = !reduceMotion.matches;
  let visible = true;
  let animationFrame = 0;
  let lastLayoutAt = -Infinity;
  let ignoreNextClick = false;

  function getMetrics() {
    const compact = size.width < 640;
    return {
      fontSize: compact ? 15 : 17,
      lineHeight: compact ? 26 : 30,
      gutterX: compact ? 20 : 38,
      gutterTop: compact ? 82 : 76,
      gutterBottom: compact ? 64 : 58,
      radius: compact ? 52 : 70,
      minSlotWidth: compact ? 62 : 90,
    };
  }

  function clampOrb(x: number, y: number): { x: number; y: number } {
    const metrics = getMetrics();
    const minX = metrics.gutterX + metrics.radius;
    const maxX = size.width - metrics.gutterX - metrics.radius;
    const minY = metrics.gutterTop + metrics.radius;
    const maxY = size.height - metrics.gutterBottom - metrics.radius;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  }

  function circleIntervalForBand(
    bandTop: number,
    bandBottom: number,
    radius: number,
  ): { left: number; right: number } | null {
    const verticalPadding = 7;
    const horizontalPadding = 14;
    const top = bandTop - verticalPadding;
    const bottom = bandBottom + verticalPadding;

    if (top >= orbY + radius || bottom <= orbY - radius) return null;

    const minDy =
      orbY >= top && orbY <= bottom
        ? 0
        : orbY < top
          ? top - orbY
          : orbY - bottom;

    if (minDy >= radius) return null;
    const maxDx = Math.sqrt(radius * radius - minDy * minDy);
    return {
      left: orbX - maxDx - horizontalPadding,
      right: orbX + maxDx + horizontalPadding,
    };
  }

  function lineSlots(
    bandTop: number,
    bandBottom: number,
  ): Array<{ left: number; right: number }> {
    const metrics = getMetrics();
    const base = {
      left: metrics.gutterX,
      right: size.width - metrics.gutterX,
    };
    const blocked = circleIntervalForBand(bandTop, bandBottom, metrics.radius);
    if (!blocked) return [base];

    const slots: Array<{ left: number; right: number }> = [];
    if (blocked.left > base.left) {
      slots.push({ left: base.left, right: Math.min(blocked.left, base.right) });
    }
    if (blocked.right < base.right) {
      slots.push({ left: Math.max(blocked.right, base.left), right: base.right });
    }
    return slots.filter((slot) => slot.right - slot.left >= metrics.minSlotWidth);
  }

  function layoutText(): PositionedLine[] {
    if (!prepared || size.width <= 0 || size.height <= 0) return [];

    const metrics = getMetrics();
    const positioned: PositionedLine[] = [];
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let y = metrics.gutterTop;
    let finished = false;

    while (y + metrics.lineHeight <= size.height - metrics.gutterBottom) {
      const slots = lineSlots(y, y + metrics.lineHeight);

      for (const slot of slots) {
        const line = layoutNextLine(prepared, cursor, slot.right - slot.left);
        if (line === null) {
          finished = true;
          break;
        }
        positioned.push({ text: line.text, x: slot.left, y });
        cursor = line.end;
      }

      if (finished) break;
      y += metrics.lineHeight;
    }

    const hasRemaining = layoutNextLine(
      prepared,
      cursor,
      Math.max(1, size.width - metrics.gutterX * 2),
    ) !== null;
    lab.toggleAttribute("data-pretext-overflow", hasRemaining);
    return positioned;
  }

  function commitLines(lines: PositionedLine[]): void {
    const metrics = getMetrics();

    while (linePool.length < lines.length) {
      const span = document.createElement("span");
      span.className = "pretext-line";
      linesLayer.append(span);
      linePool.push(span);
    }

    linePool.forEach((span, index) => {
      const line = lines[index];
      if (!line) {
        span.hidden = true;
        return;
      }
      span.hidden = false;
      if (span.textContent !== line.text) span.textContent = line.text;
      span.style.transform = `translate3d(${line.x}px, ${line.y}px, 0)`;
      span.style.fontSize = `${metrics.fontSize}px`;
      span.style.lineHeight = `${metrics.lineHeight}px`;
    });
  }

  function render(): void {
    if (size.width <= 0 || size.height <= 0) return;
    const metrics = getMetrics();
    if (!prepared || preparedFontSize !== metrics.fontSize) {
      prepared = prepareWithSegments(
        rawText,
        `500 ${metrics.fontSize}px ${fontFamily}`,
      );
      preparedFontSize = metrics.fontSize;
    }
    const clamped = clampOrb(orbX, orbY);
    orbX = clamped.x;
    orbY = clamped.y;
    orb.style.width = `${metrics.radius * 2}px`;
    orb.style.height = `${metrics.radius * 2}px`;
    orb.style.transform = `translate3d(${orbX - metrics.radius}px, ${orbY - metrics.radius}px, 0)`;
    commitLines(layoutText());
  }

  function updateMotionControl(): void {
    motionToggle.setAttribute("aria-pressed", String(autoMotion));
    motionToggle.textContent = autoMotion
      ? isChinese
        ? "暂停动态"
        : "Pause motion"
      : isChinese
        ? "播放动态"
        : "Play motion";
  }

  function selectPreset(index: number, snapToPreset = true): void {
    selectedPreset = (index + presets.length) % presets.length;
    const preset = presets[selectedPreset];
    lab.style.setProperty("--pretext-lens-color", preset.color);
    orbLabel.textContent = preset.label;
    orbNote.textContent = preset.note;
    orb.setAttribute(
      "aria-label",
      isChinese
        ? `${preset.label}变量镜头：${preset.note}。拖动可改变文字排版，点击切换变量。`
        : `${preset.label} lens: ${preset.note}. Drag to reflow the text; click to change variable.`,
    );
    presetButtons.forEach((button, buttonIndex) => {
      button.setAttribute("aria-pressed", String(buttonIndex === selectedPreset));
    });

    if (snapToPreset && size.width > 0 && size.height > 0) {
      const target = clampOrb(preset.fx * size.width, preset.fy * size.height);
      orbX = target.x;
      orbY = target.y;
      render();
    }
  }

  function animate(now: number): void {
    animationFrame = window.requestAnimationFrame(animate);
    if (!visible || !autoMotion || drag || reduceMotion.matches || !prepared) return;
    if (now - lastLayoutAt < 32) return;
    lastLayoutAt = now;

    const preset = presets[selectedPreset];
    const base = clampOrb(preset.fx * size.width, preset.fy * size.height);
    const compact = size.width < 640;
    const amplitudeX = compact ? 12 : 24;
    const amplitudeY = compact ? 8 : 14;
    orbX = base.x + Math.sin(now / 2100) * amplitudeX;
    orbY = base.y + Math.cos(now / 2700) * amplitudeY;
    render();
  }

  function localPointer(event: PointerEvent): { x: number; y: number } {
    const rect = stage.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  orb.addEventListener("pointerdown", (event) => {
    const point = localPointer(event);
    drag = {
      pointerId: event.pointerId,
      moved: false,
      startX: point.x,
      startY: point.y,
      orbX,
      orbY,
    };
    autoMotion = false;
    updateMotionControl();
    orb.setPointerCapture(event.pointerId);
    lab.setAttribute("data-pretext-dragging", "");
  });

  orb.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = localPointer(event);
    const deltaX = point.x - drag.startX;
    const deltaY = point.y - drag.startY;
    if (Math.hypot(deltaX, deltaY) > 4) drag.moved = true;
    const next = clampOrb(drag.orbX + deltaX, drag.orbY + deltaY);
    orbX = next.x;
    orbY = next.y;
    render();
  });

  function finishDrag(event: PointerEvent): void {
    if (!drag || drag.pointerId !== event.pointerId) return;
    ignoreNextClick = drag.moved;
    drag = null;
    lab.removeAttribute("data-pretext-dragging");
    if (orb.hasPointerCapture(event.pointerId)) orb.releasePointerCapture(event.pointerId);
  }

  orb.addEventListener("pointerup", finishDrag);
  orb.addEventListener("pointercancel", finishDrag);
  orb.addEventListener("click", () => {
    if (ignoreNextClick) {
      ignoreNextClick = false;
      return;
    }
    selectPreset(selectedPreset + 1);
  });

  presetButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      selectPreset(index);
    });
  });

  motionToggle.addEventListener("click", () => {
    autoMotion = !autoMotion;
    updateMotionControl();
    if (!autoMotion) render();
  });

  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    size = {
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    };
    const preset = presets[selectedPreset];
    const target = clampOrb(preset.fx * size.width, preset.fy * size.height);
    orbX = target.x;
    orbY = target.y;
    render();
  });
  observer.observe(stage);

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
    },
    { rootMargin: "120px" },
  );
  visibilityObserver.observe(stage);

  async function boot(): Promise<void> {
    await Promise.all([
      document.fonts.load(`500 15px ${fontFamily}`),
      document.fonts.load(`500 17px ${fontFamily}`),
    ]);
    lab.classList.add("is-pretext-ready");
    updateMotionControl();
    selectPreset(0, false);
    render();
    animationFrame = window.requestAnimationFrame(animate);
  }

  boot().catch(() => {
    window.cancelAnimationFrame(animationFrame);
    lab.classList.remove("is-pretext-ready");
  });
});
