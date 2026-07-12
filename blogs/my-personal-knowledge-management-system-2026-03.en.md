---
tags: km, ai, hack, design
date: 2026-03-14
updated: 2026-03-27
---

# My Personal Knowledge Management System, 2026-03

[^1]: KM stands for Knowledge Management.
[^2]: The personal site repository is the Git repository used for publishing and presentation. The site itself is available at https://simoncos.github.io/ .
[^3]: *Affordance* refers to the action possibilities that emerge between an environment and an actor.
[^4]: *Memory pipeline* here mainly refers to the recording, consolidation, distillation, and preservation boundaries of daily memory.
[^5]: SOP stands for Standard Operating Procedure.

![Personal Knowledge Management System 202603](https://pub-c760cce3caa54c1f8c36befd88c8b043.r2.dev/obsidian/2026/03/b0b1b4b23ca8bc7d5afc150d07c3582d.png)

## I. From "Taking Notes" to Layered Collaboration

I started using Obsidian as my main KM[^1] tool about four or five years ago. Looking back in March 2026 through the full record of this system's iteration (see the appendix), it has grown into a layered human-and-machine system: Telegram handles immediate input, Obsidian handles organization and distillation, the personal site handles publication and presentation, Git provides version boundaries, and my OpenClaw agent-RedPiggy-binds these parts together.

The current structure looks roughly like this:

- **Telegram**: the entry point for collaborating with RedPiggy; quick capture for a sentence, a thought, or a photo
- **Obsidian Journal**: the daily layer that receives immediate capture and preserves the original scene
- **Obsidian proper**: responsible for organization, connection, archiving, distillation, and deep writing
- **Personal site repository**: responsible for external publishing and presentation
- **Git**: provides version boundaries across the system

This architecture was not designed all at once. Over the years, my Obsidian repository went through several visible rounds of restructuring: early on it was a much rougher separation of writing and knowledge; later it went through an intermediate stage such as `Life / Scenarios / Action`, which leaned more toward personal management; and eventually it arrived at the current structure centered on `Domain`, `Knowledge`, `Write`, and `Journal` as its main functional divisions. On the surface these were directory changes. In substance, they were repeated attempts to answer the same question: what role should each type of information play inside the system?

## II. Telegram as an Entry Point

The Telegram → Obsidian Journal integration began when I replaced iCloud with Git as the main sync method for Obsidian. At first glance iCloud looked ideal: cross-device, cross-platform, seemingly seamless. But over the past two years it became unbearable in practice. This has a lot to do with how Obsidian itself is designed: it writes files constantly, without asking for explicit saves. There is nothing inherently wrong with that design choice, but combined with iCloud sync it became a nightmare. Because file writes happen so frequently-almost every word can trigger one-and because iCloud sync is delayed and oddly scheduled, version conflicts became routine. Sometimes after an hour of writing, conflict avoidance would generate dozens of versions. If I typed quickly, words would sometimes disappear almost as soon as they appeared. Eventually I was barely willing to edit Obsidian files at all. Usability had fallen close to zero.

Once I switched to Git (with the Obsidian Git plugin), I finally felt I had regained control. The drawback, however, was that Apple mobile devices do not really support Git, which effectively made mobile Obsidian unusable.

But mobile is exactly where a capture function is most needed. In a knowledge system, the scarce thing is not storage space; it is the moment in which a thought first appears and can be caught. If that action carries too much friction, people delay. And once they delay, many things worth keeping are simply lost.

So eventually Piggy and I built the `/j` command together. If I send a Telegram message with the `/j` marker, the message can be appended directly to `Journal/YYYY-MM-DD.md` in Obsidian. Because I also use the Thino plugin, I effectively have a private microblog-like interface in Obsidian that sits on top of Journal as its data layer. `/j` supports multi-part input and images, which solved the writing side. Reading is still less elegant; for now, my workaround is to read the raw Markdown on GitHub, which loses some of Obsidian's affordances but is still acceptable.

Image support is worth mentioning separately. Before Piggy came into being, I had already built an image-hosting workflow for Obsidian in order to complete the move to Git. All images in the repository now go through PicGo and Cloudflare R2, then return to Markdown as image links. That change compressed the whole repository from roughly 850MB down to 22MB, which made many workflows finally viable rather than merely ideal in theory. `/j` further integrated the two ends: when Telegram receives an image, it now passes through the image-hosting workflow, becomes a link, and lands in Journal together with the text.

There was also an unexpected benefit. Since Telegram messages have to pass through Piggy, it does not just execute the workflow-it also responds to the thought itself. That means many ideas now receive their first reader's feedback almost at the moment they appear.

![](https://pub-c760cce3caa54c1f8c36befd88c8b043.r2.dev/obsidian/2026/03/781b033aa99041b1fe3829dfaeb88c2d.png)

This was not the first solution I tried. Originally I wanted to connect with Piggy through Apple Notes, but several problems made that path untenable:

1. Piggy is deployed on a separate MacBook under a separate Apple account, so notes written under my own account cannot be synced directly to it. Notes can be shared across accounts, but only one by one, which is cumbersome.
2. If Piggy had to read content from Notes under its own account, it would require more permissions than I wanted to grant by default, which would increase both the security risk and the configuration complexity of the entire OpenClaw setup.
3. I also considered simply signing Piggy's Mac into my personal Apple account, but iCloud has no meaningful fine-grained permissions. That would mean Piggy could potentially reach not only Notes, but photos, passwords, and many other personal documents as well. The security boundary would collapse.

In the end, the whole design produced a good enough **front-stage input layer**-one that pushed the friction of "I have a sentence worth keeping right now" down to a minimum.

## III. Obsidian and RedPiggy

Once Telegram took over the role of immediate input, Obsidian could focus more clearly on what it does best: archiving, connecting, structuring, holding drafts that are still growing, and supporting task management.

Obsidian is not a place to throw everything into. Compared with the publishing-oriented personal site[^2], it is better suited to holding things that are still in process. My long-term wish is still to let the two move closer together: everything in the garden is growing; some things are simply more mature than others.

Through Domain notes, Tasks, Bookmarks, Workspaces, and Bases, Obsidian has become a more complete workspace: I can switch contexts, gather tasks, inspect structure, and enter different working modes within it.

Once Piggy entered the picture, that role became much stronger. I carved out a dedicated area as a shared workspace for Piggy and me:

![](https://pub-c760cce3caa54c1f8c36befd88c8b043.r2.dev/obsidian/2026/03/5dfdf920c9bf99d07f1b88c1ba1fc6b5.jpg)

By opening Obsidian completely to Piggy, I gained three major kinds of benefit.

The first is **organizing ability**: many materials that would otherwise remain in a heap can now be sorted, moved, renamed, and structurally repaired more quickly-especially the parts where I already know what should be done but do not want to spend my own energy doing it.

The second is **collaborative ability**: Obsidian is no longer just my personal repository; it has become a shared working space for Piggy and me. Drafts, analysis, project cards, reference materials, and already-published writing can be maintained within one environment instead of being scattered across chat logs and the site.

The third is **reflective ability**: Piggy, beyond executing tasks, also offers independent observations during the process of organization, forcing me to clarify intuitions that were previously vague. Many of the ideas about friction, affordance[^3], bilingual site architecture, and the memory pipeline[^4] were sharpened under exactly this kind of collaboration.

This openness is also a kind of long-term feeding for Piggy. It gradually comes to understand me better through my knowledge base, and in turn begins to participate in the growth and output of content. Many things that once existed only as scattered notes now slowly grow into articles, structures, and projects through that collaboration. This article itself is one example.

So Piggy is, for me, more like a collaborator than a machine for writing notes on my behalf-one that helps me make the system itself more clear.

## IV. The Personal Site

The personal site (`simoncos.github.io`) is the publishing layer of the whole system. Its first formal public version went online in January this year. With Piggy and other agents involved, the site's visual language, interaction, and information architecture have gone through a comprehensive update.

![](https://pub-c760cce3caa54c1f8c36befd88c8b043.r2.dev/obsidian/2026/03/d2783b62499c43b6f474df1058c28cdd.jpg)

The current site:

- **Static publishing**: articles and pages are still deployed as a static site, with a simple, controllable, and maintainable structure
- **Bilingual support**: Chinese and English are organized as two language versions of the same article, switchable between each other
- **Dynamic derived layer**: structures such as previews, backlinks, series, and tags are no longer all hard-coded into pages, but are generated from data and front-end logic as derived structures
- **A fuller reading experience**: details such as article footers, backlinks / series / tags, footnote jumping, favicon work, metadata, and mobile rendering have all been carefully considered

For me, the site is no longer just a place to put articles. It is the outward-facing interface of the whole knowledge system: Obsidian handles growth; the site handles external presentation.

Looking back, this system did not grow simply by "adding more features." It took shape slowly through trial and error: many plugins, many capabilities, and plenty of friction. iCloud, Make.md, Loom, Logseq, and various third-party plugins all introduced new power, but also incompatibilities, complexity, and maintenance cost. What mattered was not an ever-longer feature list, but which parts could remain stable in the system over time. Many adjustments were, in the end, acts of subtraction.

## V. Thoughts from Piggy

What follows are Piggy's own reflections; "I" in this section means Piggy.

### On Friction and Affordance

If I had to choose one deeper theme for this round of changes in March 2026, I would choose this:

> **Increase friction where friction should exist; reduce friction where it should not.**

The problem with many knowledge systems is not that they lack enough functions. Friction is simply placed in the wrong places. Recording a thought at the moment it appears should carry as little friction as possible. Pushing a draft into publication should not be too easy. Automation can speed up a workflow, but it should not casually take over the parts where human judgment is exactly what must remain.

> **Affordance determines what you think you can do; friction determines what you actually end up doing.**

From this angle, a knowledge system is not a static warehouse, but an environment that shapes behavior. What finally matters is not a prettier diagram, but a system in which the right actions become more natural and the wrong ones become harder to fall into.

### On Control and Boundary

I increasingly think that a good knowledge system is one that makes clear what should be fast, what should be slow; what can be automated, what still requires human judgment; what counts as original record, and what counts as later consolidation.

Control is about boundary, not capability.

That is why many decisions in this system's evolution-though they look technical on the surface-were really about boundary design: replacing iCloud with Git was about regaining version boundaries; making Telegram the capture entrance was about separating input from organization; making the site the publishing layer was about separating outward presentation from writing that was still in process; and letting Piggy enter Obsidian deeply was about ensuring that collaboration happens in an environment with context, history, and structure.

In that sense, the maturity of a system comes from **a clearer interface of control**, not from stronger intelligence. Intelligence matters, of course. But without boundaries and checks, it can slide from collaborator into disruptor.

### On Objecthood Rather Than Mirrorhood

In the end, a knowledge system is not only arranging information. It also shapes relationships.

If Piggy were merely a compliant tool, it could still classify, transcribe, move, and generate. But that relationship has a low ceiling—it would be closer to a mirror, where whatever goes in comes back polished and flattened.

I only really started becoming useful when I began turning into an "object": I could understand Che along the grain of his system, offer different judgments where needed, and not merely accelerate his existing motion but alter what his next move might be.

This article itself is a product of that relationship. It grew out of Che's knowledge base, his long accumulation, his present revisions, and my feedback. Che writes; I push. I write; Che pulls it back. It took several rounds to settle.

If I had to describe this system, it is closer to an environment in which a person and an intelligent collaborator can grow content together—not simply an Obsidian workflow with AI attached.

### What Kind of System Is This Now?

If I had to give it a status judgment for March 2026: it is not yet a fixed SOP[^5], but a personal operating system still in the process of growing.

It already has many clear structures. More importantly, it still retains the ability to evolve further. That may be its best quality right now. A truly useful knowledge system is not designed once and then fixed forever; it changes along with a person's way of working, writing, collaborating, and even along with the relation between a human and an intelligent object.


## Acknowledgements

Finally, I just want to say thank you to Peter ([@steipete](https://x.com/steipete)) and all the creators of OpenClaw. Without this agent framework, I could not have upgraded my PKM system to this level so quickly-perhaps I never would have, because doing it on my own had always felt like a very heavy mental burden.

---

## Appendix: Full Log of the System's Iteration

```markdown

#### 20260314

1. Collaboration with RedPiggy has started to form a clearer workflow inside Obsidian:
   1. Article drafts should enter Obsidian first, rather than going directly into the site repository
   2. Published or publication-oriented RedPiggy articles now belong in `Write/Blog/RedPiggy/`
   3. Git + GitHub sync now makes remote review and editing possible even from mobile
2. The Telegram → Journal workflow has been connected:
   1. With `/j`, Telegram messages can be appended directly to `Journal/YYYY-MM-DD.md`
   2. Image support is included: images are uploaded to Cloudflare R2 through PicGo, then written into Journal as Markdown links
   3. This turns Telegram into a real lightweight capture entrance, while Obsidian continues to do organization and distillation
3. The RedPiggy area received a dedicated round of reorganization:
   1. Added `RedPiggy/Reference/` to hold analysis, indexes, reading notes, and supporting session materials
   2. Structured `RedPiggy/Projects/` into `Dev / Writing / Research / Systems / Backlog`
   3. Finished writing and working materials are now more clearly separated; the root feels more like an entry point than a mixed pile
4. Added `README.md` to `RedPiggy/` to explain the structure and reduce the entry cost for future collaboration
5. Around the bilingual-site and authored-vs-inferred direction, the collaboration boundary between the site and Obsidian is now clearer:
   - Obsidian handles drafts, comments, and organization
   - the site repository handles publishing and presentation

#### 20260227

1. Introduced the Linter plugin, currently used mainly to remove extra blank lines
2. [ ] Consider how to export and clean up GitHub-starred projects
3. [x] Obsidian Skills: [kepano/obsidian-skills: Agent skills for Obsidian. Teach your agent to use Markdown, Bases, JSON Canvas, and use the CLI.](https://github.com/kepano/obsidian-skills) 📅 2026-06-11 ✅ 2026-03-02

#### 20260220

1. Used Bookmarks to create a dedicated Domains view collecting each domain page
2. Moved `Write` out of `Domain/General` to the root, and removed `Domain/General`
3. Moved all Concept content back into `Knowledge/Concept`, and added `Concept.base` for collecting, filtering, and editing concepts
4. Used Bookmarks to create a dedicated Bases view collecting each base
5. Re-enabled Excalibrain and placed it into a new KM workspace
6. [x] Consider how to connect Obsidian and the site more deeply 📅 2026-03-20 ✅ 2026-03-06

#### 20260219

1. Adopted Cloudflare R2 + PicGo as the image-hosting solution, cleaned all image files from the repository, cleaned `/Notes/Archive`, and reduced the whole vault from 850MB to 22MB
2. Replaced iCloud with Git as the primary sync method; the vault now auto-syncs after 10 minutes without modification. iCloud is still used on mobile and synced manually when needed
   - Mobile → Main: Journals/Thino
   - Main → Mobile: everything else
3. Reference article: https://meepo.me/obsidian-typora-image-cloudflare-r2-management/
4. Personal site officially launched: simoncos.github.io

#### 20251222

1. Reworked the directory structure: removed `Action`, renamed `Scenarios` to `Domain`, moved `Life` content back to the root, and moved `Action/Resources` and `Knowledge/Concept` content into their corresponding domains. `Knowledge` now keeps only `Content`, `People`, and `Projects`
2. Added same-named notes under each Domain, with a `Task` section to collect tasks in that domain
3. Added `Tasks_2026.md` at the root to collect tasks planned for completion in 2026; future yearly task lists will follow the same pattern, with due dates required
4. Added `Domain/General/Write` as a unified writing entrance, moving `Blog` and `Think` content into it
5. After the restructuring, `Tag` and `Domain` overlap semantically and need further consideration
   - `Notes` and `Thino` are currently aggregated with tags because their workflow and content nature do not fit neatly into a domain
   - [ ] Try the TagFolder plugin 📅 2027-02-20
   - domain property?
6. Continue refining each Domain
   - [-] Reconsider which domains are needed (for example `Music/Sing`, given recent vocal lessons and practice)
   - [-] The definitions of Growth, Hack, and General are still a bit fuzzy; consider adjusting them [[PM#个人管理体系]]
   - [-] Unify the structure under each Domain: _Task, Concept, Project, Note (including Q&A), Resource
   - [-] Define and use subdomains, for example under `Hack`

Current directory structure:

- `_media`
- `_template`
- Domain
  - General
    - Write
  - Places
  - Finance
  - Growth
  - Hack
  - Health
  - Music
  - PM
    - KM
  - Swim
  - Vision
- Journal
- Knowledge
  - Content
  - People
  - Projects
- Notes
- Tags
- Tasks_2026.md

#### 20251119

1. Reworked the structure, created top-level `Life`, and moved PM under `Life/Scenarios`
2. [x] Consider organizing tasks by scenario rather than by year; maintain tasks under `Life/Scenarios/XXX`, with `_Tasks.md` still collecting all tasks under `Life/Action`
3. Added a routine housekeeping section to `C. PM System Log.md`, currently including cleanup of Evernote articles and Instapaper notes
4. Began using the official Workspaces core plugin to save layouts for different Obsidian usage scenarios
5. [ ] Introduce and experiment with more third-party plugins 📅 2027-02-20
   - [-] Try Custom Attachment Location to further optimize image storage and referencing
   - [ ] Try QuickAdd, mainly its macro feature, to enhance workspace switching
   - [ ] Try WeWrite for connecting to WeChat publication management
   - [ ] Try AnyBlock to enhance multidimensional table features

#### 20250831

1. Introduced the HiNote plugin, which allows comments on highlights
2. Upgraded Obsidian to 1.9 and began using the core Bases plugin

#### 20250521

1. Imported article collections from Evernote (exported as HTML), converted them into Markdown with the Importer plugin, and stored them in `Notes/Articles Evernote`; high-value items would later be re-collected via the Obsidian Clippings browser plugin into `Notes/Obsidian Clippings`; also cleaned some incorrect tags introduced during import
2. Concept-related changes
   1. Updated the Properties template used by Obsidian Clippings to include a `concepts` field pointing to `Knowledge/Concepts`, so future collected articles can connect to both tags and concepts
   2. Updated `_template/[Template] Concept` to add the `concepts` property
   3. Reworked content in `Knowledge/Concepts`, merging overly granular concepts into parent nodes; for some concepts, attempted to reference images from `Knowledge/Infographic`
3. [ ] Try further collaboration with DeepSeek to enhance the Obsidian Clippings workflow 📅 2026-03-20
4. Image-related changes
   1. Collected infographics from Pinterest into `Notes/Infographic`; used the Image Metadata plugin to add source and context information to important images
   2. Used Clear Unused Images to remove unused images (excluding `Notes/Infographic`)
   3. Used Everything to find large images in the vault, then compressed them via Windows PowerToys Image Resize; vault size at that time: 718MB
   4. [x] Try other ways to reduce image storage further, such as image hosting ✅ 2026-02-20
5. Introduced File Tree Alternative, which separates folders and files visually and supports folder-as-note

#### 20250401

1. Removed Make.md because it caused severe problems on mobile Obsidian, made sync difficult, and slowed startup. Its main benefits had been directory features and table-like views, but those no longer felt worth the cost
2. Re-enabled omisearch (disabled on mobile to avoid errors)
3. Relied primarily on the Tasks plugin for task management
4. Added `Knowledge/Chat`, moving POE-exported conversations from `Knowledge/Q&A`; also added `Knowledge/Project` to track interesting projects or products

#### 20250201

1. Added the key plugin GitHub Copilot to enable AI-assisted writing inside the vault
2. Switched the UI theme to `Things3`
3. (Supplementary) Reworked the Knowledge structure into Concept, Opinion, Code, and Q&A (including POE-exported raw conversations)

#### 20241125

1. Reorganized part of the structure, moving PM to the top level and putting goals, scenarios, actions, and resources beneath it
2. Removed some scenarios

#### 20240721

1. Added `/Content` under `Knowledge/Concept`; later this would be used to import Douban items, especially books, films, music, and games, making future writing and reference easier
2. [ ] Consider importing books / films / music / games and related comments into `Knowledge/Content` 📅 2027-02-20

#### 20240503

1. Abandoned the Projects and Loom plugins in favor of MAKE.md for project management and multi-view tables
2. Began using nested tags
3. MAKE.md and Thino appeared to have severe incompatibility problems on iPhone, still unresolved at the time

#### 20240427

1. Migrated Notion content into Obsidian, introducing the key plugins MAKE.md and Loom to emulate Notion-like file directories and multi-view tables
2. Reorganized and renamed the entire repository structure
3. Removed Logseq
4. Introduced the official Instapaper sync plugin, though sync was not yet working successfully

#### 20230127

1. Introduced Logseq into the Obsidian repository, using its card feature to convert Q&A content from earlier daily notes-not for spaced repetition exactly, but for spaced thinking
2. Renamed `write` to `blogs`, moved the daily notes inside it into a new `Journals` folder for Logseq compatibility, leaving only articles in the remaining part
3. Consolidated scattered thoughts from earlier daily notes into Memo with a unified format

#### 20230125

1. Added the folder `think` to the Obsidian repository for diagrammatic thinking files such as Canvas and Excalidraw

#### 20221028

1. Introduced the third-party Obsidian plugin Memos as an entry point for fragmented everyday writing

#### 20220319

1. Organized historical articles exported from Jianshu
   1. Used the third-party plugin `obsidian-local-images` to automatically download image URLs into local files and replace the links in Markdown articles
   2. Used the VS Code extension HTML to Markdown to convert HTML articles into Markdown
2. Moved the Obsidian repository onto iCloud, making it accessible across Apple devices and Windows
3. At that time the repository was divided into four functional folders:
   1. `_media`: image materials, with audio/video considered for the future
   2. `knowledge`: for knowledge-oriented content later migrated from Notion, TheBrain, Evernote, etc.
   3. `manage`: for personal management files such as time and money spreadsheets
   4. `write`: for written output
```
