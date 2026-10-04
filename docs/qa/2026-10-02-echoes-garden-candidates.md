# Endless Echoes — garden direction candidates

Status: historical record of the first two directions. The owner chose v2 (the second piano composition) as the base for the published art, which was developed from it into `endless-echoes-garden-v5.webp` (see `2026-10-02-echoes-interactive-art.md`). The candidates themselves were never wired into the site.

## Rationale and references

The owner read the previous ribbon as a leather belt and suggested studying Eason Chan's FEAR and DREAMS concert visuals. This direction uses a recognisable piano, saturated flowers and theatrical dark space. The imagery connects music, dreamlike transformation and branching choices without artist portraits, concert branding or song titles.

- Concert art: https://artbox.jimmywonderland.com/shop/fear-and-dreams-eason-chan-in-concert-boxset-7
- Official account of dream imagery and narrative: https://www.umusic.com.tw/news_page.php?q=1670917630
- Stage reference, viewed during research: https://en.acmelighting.com/Uploads/attached/image/20220507/FaDConcert8.jpg

## Candidates

- v1: a piano garden in a fantasy landscape. Clear musical subject, but mountains and ruins compete with it.
- v2 (recommended, and chosen by the owner): removes landscape, contains the piano, flowers and short branching stairs in a sparse theater. Stronger hierarchy and cleaner connection to the game's paths.

Both were produced with the built-in imagegen tool. v1 is a new generation; v2 is an edit of v1. Raw PNGs remain in the generating Codex session's `generated_images` folder (local, outside the repository) under the following filenames:

- `exec-e1e4eb11-cf76-4ad6-99f1-0a7fb68f7f0b.png`
- `exec-a7d9d8b7-658f-4fa9-bf85-4bdf58d3065e.png`

Project candidate kept in the repository (1200 × 800, cwebp quality 86, no crop): `gallery/music/assets/endless-echoes-garden-v2.webp`. The v1 image was not kept; its raw PNG above is the source.

The rendered image was reviewed for the musical subject, complete flower/piano silhouette, safe margins, unwanted text, and the owner's no-green preference. No page integration or responsive visual QA was performed on the candidates themselves; the chosen direction was integrated later.

## Initial generation prompt

```
Use case: stylized-concept.
A new original art direction for Endless Echoes, a branching song riddle website, as a sophisticated surreal concert-poster illustration. The idea is "a garden grown from sound": a recognisable black grand piano on a small circular theatrical platform, its clear black-and-white keyboard facing the viewer. From inside its open lid, a dense, dramatic arrangement of real flowers grows into the air: vermilion poppies, orange dahlias, electric blue delphiniums, small butter-yellow blossoms, with two orange butterflies. A few narrow pale architectural stairways curve and fork toward the platform from the bottom left, like paths remembered in a dream. These are stairs with real steps, not ribbons, not belts. The flower stems have a sparse branching silhouette but are not a data chart.
Art direction: highly crafted surreal photographic collage with the precision of an art-book cover, theatrical emotional scale, matte printed finish, fine botanical detail. One striking coherent composition, not a pile of unrelated symbols. Deep slate-blue to charcoal atmosphere, large clear luminous coral-red blooms and cobalt accents against quiet grey-blue mist. Let the left side be darker and spare, the right side bloom into color. A restrained pool of warm stage light under the piano. No grungy greens or muddy brown. No metallic accessories, no audio tape, no ribbons, no infinity symbol, no jewellery, no leather, no cosmic stars or galaxies, no ornamental UI.
Composition: landscape 3:2. The entire piano, its keys, flowers and the main branching stairs must fit comfortably inside the central 80 percent so it is legible at thumbnail size. Strong visual hierarchy: piano first, impossible blooming flowers second, branching stairs third. Use an oblique three-quarter viewpoint from slightly above so the piano is immediately identifiable. Keep the architecture secondary. Generous breathing room around the silhouette.
No people, faces, portraits, artist likenesses, logos, text, letters or numbers. This should be independent artwork, not a reproduction of any existing concert poster. Render one finished clean artwork, not a mockup or contact sheet.
```

## Refinement prompt

```
Edit this artwork into a much more disciplined theatrical art direction for a music-riddle website. Keep the recognisable grand piano, its clearly visible black-and-white keyboard, the vibrant vermilion/orange/cobalt flowers growing from the open lid, and a small orange butterfly. Keep a circular platform and a small fork of pale stairs as a secondary symbol of branching choices.
Crucial change: completely remove all mountains, castle ruins, arches, trees, landscape, clouds and fantasy-world scenery. Replace them with a quiet seamless charcoal/slate-blue theater void with a single subtle soft pool of stage light. No stars. No galaxies. No fog bank. No green. The negative space should occupy at least 40% of the composition. This is an art-directed surreal photographic collage for a contemporary concert poster, not fantasy concept art or a videogame environment.
Shrink and reposition the entire piano/flower/platform group so ALL flower tips, piano feet and the short branching stairways are fully inside the frame, with at least 10% clear margins on every edge. The piano is near the center-right, the 3 short narrow stair branches fan gently into the lower-left. Flower mass is compact and asymmetrical with about three dominant red/orange blossoms, cobalt sprigs and restrained pale flowers; fewer tiny decorative filler blossoms. Crisp botanical forms and strong silhouettes, restrained matte surface, beautiful dark/light and grayscale/saturated-color contrast. Clear hierarchy at thumbnail size. Atmospheric but not glow-heavy. No smooth metallic ribbon, belts, jewellery, or infinity symbols. Remove any branding from the piano.
Landscape 3:2, no typography, no text, no logos, no people, no borders, no mockup. Preserve the musical subject and vivid flower palette but make the overall scene spare, theatrical and visually sophisticated.
```
