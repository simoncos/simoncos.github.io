# Echoes: full screen, and near misses

Two changes the author asked for on 2026-10-04, on top of the released score batch (`73c4a8d`).

## Full screen

The author: the main areas no longer fit in one screen. Measured with the 孤独患者 trail (the longest clue on it), Chinese, after scrolling the card to the top of the window:

| Window | Outside the screen before | Outside after full screen | Map drawn in |
|---|---|---|---|
| 1440 × 900 | keyboard, map, legend | none | 1032 × 764 |
| 1366 × 768 | hint, keyboard, map, legend | none | 958 × 632 |
| 1280 × 800 | hint, keyboard, map, legend | none | 872 × 664 |

The card is 912–914 px tall at all three widths and starts about 524 px down the page, under the title and the picture.

- **What it does.** A 全屏 / Full screen button beside 放大地图 and 定位当前. The card fills the screen through the Fullscreen API (the browser's own bar goes too); the map scales into the space beside the clue; the clue column scrolls inside itself if it ever needs more than the screen. On screens up to 820 px tall the column is tightened (smaller flower, closer rows). Without the API (iPhone Safari) the same layout covers the page and the browser bar stays.
- **Esc.** In real full screen the browser takes Esc and leaves full screen; the layout follows. A playing finale therefore needs a second Esc, or the Stop button. In the fallback, Esc stops a score first, and with nothing playing leaves full screen.
- **Phone.** The button is not shown at 900 px or less (the phone already has the full-map dialog); leaving that width while in full screen exits it.
- **Checked** (Chrome via Playwright, `score-qa/fullscreen-check.cjs`, outputs `out/fullscreen-check-4.txt` and `out/fullscreen-phone.txt`): the table above; an answer typed in full screen advances the game and stays in full screen; the button leaves full screen and relabels; the fallback without the API covers the screen and Esc leaves it, with the English label; no page errors; on iPhone 13 Pro emulation the button is absent from the map dialog. Headless Chrome keeps the window size in full screen, so on a real laptop the screen is taller than the window measured here by the browser's own bar.
- **Not checked:** Safari and Firefox, a real iPad, the finale played inside full screen.

## Near misses (decoys)

A node can list `decoys` (`docs/MUSIC_RIDDLE_DATA.md`): songs a player is likely to type that are not this path's answer. 13 entries on 11 nodes: the five twins with other lyrics (白玫瑰 / 红玫瑰, 月黑风高 / 黑择明, 爱情转移 / 富士山下, 不如不见 / 好久不见, 明年今日 / 十年) wherever the twin's partner is an exit, 四季 at the three songs that lead to 四季圈, and 热岛小夜曲 at 倒带人生. The author chose that twins are never accepted, only named. The list comes from the content review's M2; 四季 and the two Mandarin versions from 《认了吧》 were rechecked on 2026-10-04.

- A decoy shows its own line (「很近了：《白玫瑰》和这条路要接的歌是同一段旋律，它是粤语版。试试国语那首。」), is not counted towards the hint nudge, does not shake the field and does not mark it invalid.
- The validator rejects a decoy that matches any answer of its node or the current song; the page carries title, aliases and message only.
- **Checked** (`score-qa/decoy-check.cjs`, 12 of 12 in Chinese and English): 白玫瑰 and the traditional 不如不見 on 孤独患者 show their lines; two decoys do not nudge the hint; an unrelated guess still gets the generic error; 红玫瑰 still solves; no page errors.

`make check-all` passes (86 tests). The auto finale still runs end to end outside full screen (`out/finale-auto-fullscreen-branch.txt`).
