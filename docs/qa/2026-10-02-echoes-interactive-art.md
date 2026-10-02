# Endless Echoes: botanical nodes and interactive art

Owner direction: extend the visual work to the whole puzzle and controls; use generated flowers resembling the cover; keep copy about songs and clues. Use the second piano composition as the base and introduce branching/returning stairs. Earlier ribbon artwork was rejected as resembling a belt.

## Runtime changes

- Four transparent botanical sprites replace geometric SVG petals, including map nodes, current-song artwork and collection buttons.
- First discoveries play a short synthesized pentatonic note. No recordings or song melodies are used. No audio context is created on page load; revisits and muted discoveries are silent. Mute persists independently from progress.
- Discoveries animate the node and a light along the traversed edge. Returning to the start and reaching the ending have distinct effects. Reduced-motion disables these effects.
- Phone maps begin enlarged and centered on the current song, with a full-map control. Controls retain direct song/clue terminology.
- Node hit areas and arrow clearance were enlarged. The bonus title sits below its node to avoid the ending label.
- Data, route identities and the progress storage key remain unchanged.

## Asset provenance

Built-in imagegen, two calls using `endless-echoes-garden-v2.webp` as reference/edit target. Raw outputs are retained in the session's generated_images directory:

- Cover: `exec-d7c27d3c-1a60-4dba-835f-468d96653d30.png`, 1536 × 1024.
- Equal 2 × 2 transparent flower sheet: `exec-74d1ff1f-fba4-40ac-ab86-a3bc64f62588.png`, 1254 × 1254 RGBA.

Runtime assets are in `gallery/music/assets/`:

- `endless-echoes-garden-v3.webp`: 1200 × 800, cwebp quality 86, full frame, no crop.
- `echo-flower-{poppy,blue,ivory,dahlia}.webp`: 192 × 192 each, cwebp quality 88, original alpha retained. Four non-overlapping quadrant crops at the 626-pixel boundary, then resized. Combined 49,926 bytes. No contact sheet is shipped to the page.
- The generated cover/poster SVGs embed the same v3 artwork and keep the title as editable SVG text.

All four sprite alpha bounding boxes have transparent margins; no petals touch the image edges. Sprites were reviewed in the actual map and at 22-pixel collection size on light and dark backgrounds. Asset hashes:

| Sprite | SHA-256 |
| --- | --- |
| poppy | 1fd1fc2c92ef90d37ea9f905fa13fe6988ee70285afb4457fa5cb90300b6667e |
| blue | 091b4fcc78e990a5f6f2f01e606128d63ee943419a53c7ffbca9330e919e8434 |
| ivory | a9e188e7ab02261458ee4c9cd909c5cb62a5cd981c0516d308678c1a33ae269e |
| dahlia | a41a3037f7d2f5fd031a37f803aff42082fa9a5afdb8b19e6a17e28946796e03 |

## Validation

- `make generate`, `make check-all`: PASS, including 69 Python tests and generated TypeScript parity. `build_pages.py --check` and `git diff --check` passed after the bonus-label adjustment.
- Interactive IAB testing: fresh progress on a separate localhost origin; successful typed answers; incorrect-answer feedback; hint/reveal mutual exclusion; reveal to a new node; ending; loop; restored progress and sound preference.
- WebAudio events: first new answer created one context and two oscillator partials; repeating that answer and a muted new discovery created no audio nodes. This verifies browser audio generation, not subjective listening on physical speakers.
- Reduced motion: computed animation `none`; normal mode: node bloom, path light and ending/loop classes confirmed. Ending before all discoveries did not expose the hidden node.
- 390-pixel viewport: no page overflow, enlarged map, clue focus at ~110px after reveal. 1440-pixel fully discovered map: 37 displayed nodes, 36/36 progress, no label intersections after adjustment. Browser error log empty.
- Screenshots: IAB's capture endpoint failed. Visual checks use isolated headless Chrome. Full-state desktop screenshots render an exported actual IAB DOM (scripts stripped, asset base preserved); 390px light and 768px dark review frames render the live local page.
- Existing saved progress was preserved; no reset was used.

## Exact generation prompts

### Flower sheet

Use case: background-extraction / stylized-concept. Image 1 is the botanical style and species reference, NOT a composition to reproduce. Create a clean production-ready transparent 2 by 2 sprite sheet of FOUR separated photorealistic botanical flower cutouts, matching the flowers growing from the piano in Image 1. Equal square quadrants on a square canvas, no dividers or labels. Top-left: one vermilion red-orange poppy, front-facing, silky irregular petals and a dark central eye. Top-right: a compact cobalt-blue delphinium blossom cluster, mostly face-on, no tall stalk. Bottom-left: a warm ivory cream daisy, face-on with a golden center and irregular natural petals. Bottom-right: a burnt orange dahlia, face-on, layered narrow petals. Each entire blossom fits within the central 70% of its own square quadrant, centered, generous fully transparent gutters; no overlaps across cells. These will be network node sprites rendered about 32 to 52 pixels wide, so broad readable flower silhouettes and strong colors matter, no fragile microdetail or long stems. Natural realistic botanical texture, matte theatrical lighting and softly lit petal edges, coherent with the reference. True RGBA transparent background, no black field, no checkerboard painted into image, no ground shadows, no typography, no icons, no frames, no piano, no leaves or foliage. Four distinct flowers only.

### Cover edit

Use case: precise-object-edit. Image 1 is the edit target. Preserve the piano, its recognizable keyboard, the vivid red-orange poppies and cobalt-blue flower arrangement, butterfly, restrained theatrical blue-charcoal lighting, and the clean negative space of this artwork. Change the low circular platform and its simple stair branches into a compact, elegant Escher-inspired impossible stair structure: a pale stone ring of stairs making one visually clear continuous return loop, with two short branching stair flights joining it and the piano's upper landing. The viewer should immediately perceive paths that fork, climb, meet and return. A subtle impossible-perspective junction is welcome, but keep actual individual stone steps sharply visible and physically architectural; no smooth ribbon/belt shape. The piano and flowers remain the dominant focal point, the stepped loop the secondary subject. Keep all stair ends, flower tips, platform, piano and keyboard fully inside the image with generous 10% margins. Do not add mountains, buildings, clouds, ruins, large scenery, extra instruments, lettering or concert branding. Keep the warm ivory stone versus deep navy contrast, with no dirty green. Landscape 3:2; clean contemporary surreal photographic collage. No need to add cassette or CD; express the musical branching and looping through the architecture without clutter.
