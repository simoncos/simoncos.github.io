import {
    layoutNextLineRange,
    materializeLineRange,
    prepareWithSegments,
    setLocale,
    type LayoutCursor,
} from '../../projects/assets/vendor/pretext/layout.js'

type Interval = { start: number; end: number }
type Obstacle = { left: number; right: number; top: number; bottom: number }

const MOBILE_BREAKPOINT = 680
const MIN_INTERVAL = 148
const OBSTACLE_GAP = 17
const MIN_STAGE_HEIGHT = 760
const MAX_STAGE_HEIGHT = 1536
const STAGE_GROWTH_STEP = 192

function sameCursor(a: LayoutCursor, b: LayoutCursor): boolean {
    return a.segmentIndex === b.segmentIndex && a.graphemeIndex === b.graphemeIndex
}

function subtractObstacle(intervals: Interval[], left: number, right: number): Interval[] {
    const next: Interval[] = []
    for (const interval of intervals) {
        if (right <= interval.start || left >= interval.end) {
            next.push(interval)
            continue
        }
        if (left > interval.start) next.push({ start: interval.start, end: left })
        if (right < interval.end) next.push({ start: right, end: interval.end })
    }
    return next
}

function freeIntervals(
    y: number,
    lineHeight: number,
    width: number,
    obstacles: Obstacle[],
    padding: number,
): Interval[] {
    let intervals: Interval[] = [{ start: padding, end: width - padding }]
    for (const obstacle of obstacles) {
        const intersects = obstacle.bottom + OBSTACLE_GAP > y
            && obstacle.top - OBSTACLE_GAP < y + lineHeight
        if (!intersects) continue
        intervals = subtractObstacle(
            intervals,
            Math.max(padding, obstacle.left - OBSTACLE_GAP),
            Math.min(width - padding, obstacle.right + OBSTACLE_GAP),
        )
    }
    return intervals.filter(interval => interval.end - interval.start >= MIN_INTERVAL)
}

function boot(): void {
    const sceneQuery = document.querySelector<HTMLElement>('.haba-flow-scene')
    if (!(sceneQuery instanceof HTMLElement)) return
    const scene: HTMLElement = sceneQuery

    const stageQuery = scene.querySelector<HTMLElement>('[data-haba-flow-stage]')
    const canvasQuery = scene.querySelector<HTMLCanvasElement>('[data-haba-flow-canvas]')
    const staticTextQuery = scene.querySelector<HTMLElement>('[data-haba-flow-static]')
    if (!(stageQuery instanceof HTMLElement)
        || !(canvasQuery instanceof HTMLCanvasElement)
        || !(staticTextQuery instanceof HTMLElement)) return
    const stage: HTMLElement = stageQuery
    const canvas: HTMLCanvasElement = canvasQuery
    const staticText: HTMLElement = staticTextQuery

    const context = canvas.getContext('2d')
    const supportsLayout = 'Segmenter' in Intl && context !== null
    const flowText = Array.from(staticText.querySelectorAll('p'))
        .map(paragraph => paragraph.textContent?.trim() ?? '')
        .filter(Boolean)
        .join('\n\n')
    if (!supportsLayout || !flowText) {
        stage.dataset.habaPretext = 'fallback'
        return
    }

    setLocale('zh-CN')

    let scheduledFrame: number | null = null
    let failedWidth: number | null = null

    function disableEnhancement(): void {
        scene.classList.remove('is-enhanced')
        stage.classList.remove('is-enhanced')
        stage.style.removeProperty('height')
        stage.dataset.habaPretext = 'fallback'
        canvas.hidden = true
    }

    function getObstacles(): Obstacle[] {
        return Array.from(stage.querySelectorAll<HTMLElement>('[data-haba-obstacle]'))
            .map(element => ({
                left: element.offsetLeft,
                right: element.offsetLeft + element.offsetWidth,
                top: element.offsetTop,
                bottom: element.offsetTop + element.offsetHeight,
            }))
    }

    function render(): void {
        scheduledFrame = null
        if (!stage.classList.contains('is-enhanced') || context === null) return

        const width = stage.clientWidth
        const height = stage.clientHeight
        if (width <= 0 || height <= 0) return
        const borderBoxDelta = stage.offsetHeight - height

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
        const targetWidth = Math.round(width * pixelRatio)
        const targetHeight = Math.round(height * pixelRatio)
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth
            canvas.height = targetHeight
        }

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
        context.clearRect(0, 0, width, height)

        const fontSize = Math.min(18.2, Math.max(16.8, width / 43))
        const lineHeight = Math.round(fontSize * 1.72)
        const font = `500 ${fontSize}px "Noto Serif SC", "Songti SC", STSong, serif`
        const prepared = prepareWithSegments(flowText, font, { whiteSpace: 'pre-wrap' })
        const padding = 29
        const bottomPadding = 30
        const obstacles = getObstacles()
        const styles = getComputedStyle(scene)
        const flowColor = styles.getPropertyValue('--haba-flow-ink').trim() || '#263047'

        let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
        let y = padding
        let lastDrawnBottom = padding
        let previousCenter = width

        context.save()
        context.font = font
        context.fillStyle = flowColor
        context.textBaseline = 'top'

        while (y + lineHeight <= height - bottomPadding) {
            const intervals = freeIntervals(y, lineHeight, width, obstacles, padding)
            if (intervals.length === 0) {
                y += lineHeight
                continue
            }

            intervals.sort((a, b) => {
                const aWidth = a.end - a.start
                const bWidth = b.end - b.start
                const aCenter = (a.start + a.end) / 2
                const bCenter = (b.start + b.end) / 2
                const aScore = aWidth - Math.abs(aCenter - previousCenter) * 0.1
                const bScore = bWidth - Math.abs(bCenter - previousCenter) * 0.1
                return bScore - aScore
            })

            const interval = intervals[0]
            if (interval === undefined) break
            const range = layoutNextLineRange(prepared, cursor, interval.end - interval.start)
            if (range === null || sameCursor(cursor, range.end)) break
            const line = materializeLineRange(prepared, range)
            if (line.text.trim()) context.fillText(line.text, interval.start, y)
            cursor = range.end
            previousCenter = interval.start + line.width / 2
            y += lineHeight
            lastDrawnBottom = y
        }
        context.restore()

        const remaining = layoutNextLineRange(prepared, cursor, Math.max(1, width - padding * 2))
        if (remaining !== null) {
            const expandedHeight = Math.min(
                MAX_STAGE_HEIGHT,
                stage.offsetHeight + STAGE_GROWTH_STEP,
            )
            if (expandedHeight > stage.offsetHeight) {
                stage.style.height = `${expandedHeight}px`
                stage.dataset.habaPretext = 'resizing'
                scheduleRender()
                return
            }
            failedWidth = Math.round(width)
            disableEnhancement()
            return
        }

        const lowestObstacle = obstacles.reduce(
            (lowest, obstacle) => Math.max(lowest, obstacle.bottom),
            0,
        )
        const fittedHeight = Math.max(
            MIN_STAGE_HEIGHT,
            Math.ceil(
                Math.max(lastDrawnBottom, lowestObstacle)
                + bottomPadding
                + borderBoxDelta,
            ),
        )
        if (Math.abs(stage.offsetHeight - fittedHeight) > 2) {
            stage.style.height = `${fittedHeight}px`
            stage.dataset.habaPretext = 'resizing'
            scheduleRender()
            return
        }

        failedWidth = null
        stage.dataset.habaPretext = 'enhanced'
    }

    function scheduleRender(): void {
        if (scheduledFrame !== null) return
        scheduledFrame = requestAnimationFrame(render)
    }

    function updateMode(): void {
        const width = stage.clientWidth
        const failedAtCurrentWidth = failedWidth !== null && Math.abs(failedWidth - width) < 32
        if (width < MOBILE_BREAKPOINT || failedAtCurrentWidth) {
            disableEnhancement()
            return
        }
        scene.classList.add('is-enhanced')
        stage.classList.add('is-enhanced')
        canvas.hidden = false
        scheduleRender()
    }

    const resizeObserver = new ResizeObserver(updateMode)
    resizeObserver.observe(stage)

    const themeObserver = new MutationObserver(scheduleRender)
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-effective-theme'],
    })
    themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
    })

    for (const image of stage.querySelectorAll('img')) {
        if (!image.complete) image.addEventListener('load', scheduleRender, { once: true })
        image.decode?.().then(scheduleRender).catch(() => undefined)
    }

    document.fonts.ready.then(scheduleRender).catch(() => scheduleRender())
    updateMode()
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true })
} else {
    boot()
}
