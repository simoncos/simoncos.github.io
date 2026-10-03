---
tags: design
date: 2026-10-03
translation: Claude Opus 5.5
description: Over the past two weeks I rebuilt this site from scratch: a Work wheel, Favorites, a 2017 music riddle brought back, and a 40-second intro video, which led me to transcribe the score of Sunny Day along the way.
---

# Personal Site, Remake

Between September and today I rebuilt this site from top to bottom, and made a 40-second intro video along the way. Claude and Codex wrote most of the code; I set the requirements, picked at flaws and made the calls. This remake is not just a fresh coat of paint. It is also a way of sorting myself out, and a re-branding. This post is a small record of it.

<video class="post-film" src="assets/images/personal-site-remake/intro.en.mp4" poster="assets/images/personal-site-remake/intro.en.jpg" width="720" height="1280" controls playsinline preload="none" aria-label="The 40-second intro video: sleep data, the talk, the Work wheel, Sunny Day, Endless Echoes, articles, Haba Snow Mountain and Favorites, until every dot connects into the site’s name"></video>

<small>Piano samples in the video: [YDP Grand Piano](https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html), recorded by Zenph Studios, prepared by the FreePats project, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).</small>

## The site

The new version started from a design package. Late at night on September 26, I packed up the design drafts I had been polishing on and off for two or three weeks, put them in the repository, and had Claude build and deploy them. The new site was live a little over an hour later.

The real time went into the two weeks after that. Part of it was bringing back the small features of the old site; the other part was moving more of my past writing over: from 8 articles at launch to 64 now, the earliest written in 2008, all in both Chinese and English.

A few things I like about the new design:

**[The Work wheel](../gallery.html?lang=en).** I sorted my work into five kinds: apps, games, talks, research and music. On the Work page you swipe sideways, one notch at a time, with a cover for each kind.

**Interactive pages.** Much of my work is interactive web pages (interactive content is also a direction I want to take my own work in): [ten years of sleep records](../projects/sleep-2016-2026.en.html) (3,656 nights), a [social network study](../gallery/research/zhihu-2015.html?lang=en) built on 2015 Zhihu data, and [HN × LLM](https://simoncos-hn-llm-research.vercel.app/). You can click, filter and look around in all of them right on the page.

**[Favorites](../favorites.html?lang=en).** Everything I have rated five stars on Douban, books, films, music and games: 453 in all, 222 of them with a short review. They are an important part of me too, the things I grew up on.

Next come the parts that deserve more space.

## An experimental game: Endless Echoes

In 2017 I made an [Eason Chan playlist riddle](../gallery/music/endless-echoes.html?lang=en) on Douban and Xiami: each song's recommendation note was the clue to the next song. There were 26 songs. The riddles were first laid out in the comments of each song on Xiami Music, and [the article introducing the game](https://www.jianshu.com/p/bacb95af08b1) (in Chinese) was even officially featured by Xiami.

This time my first goal was to restore it. Codex helped make the first version, rebuilding 26 songs and 31 paths from the Douban list, but when I played it I got a bit stuck. Something always felt off, and I had lost the complete original design map. Later I dug up a Xiami Music export stored in my OneDrive, and the 26 notes matched one by one, which finally settled the answers. Going back through those songs and notes, and even just thinking of the name Xiami Music, stirred up a lot of memories.

Then I started expanding it: to 36 songs and 47 paths, and the new clues were still written by me, not by AI. Find all 36 Eason Chan songs and there are a few small surprises.

The visuals went through many rounds. It started out a dark green I didn't like; the cover image started as a cassette tape, which at first glance I read as a belt; so at my request it became flowers, a piano and an Escher-like space. The whole route map is shaped like a rose, and each song is a flower too, borrowing from the art concept of Eason Chan's Fear and Dreams concerts. Each time a song is guessed, its flower lights up and a chord sounds. The chords start from a Csus2 at the beginning and finally come to rest on C.

The echoes themselves have become an echo.

## Projects still growing

There are seven cards on the Work page that you can't click into yet. These are things I have been working on for the past few months that are not yet ready to show:

- **Daily Oracle**: draw a card each day, go do a small thing in the real world, and come back to log it. Over time the card collection grows and the garden comes into full bloom.
- **Vocal Coach**: a phone app for singing in tune: sing along to a target note and see live whether you are sharp or flat. The piano in Endless Echoes and in the intro video first came from the real samples I found while making this app.
- **Paper Research Platform**: ask the same set of questions of a batch of papers; a model answers for each paper with evidence from the text, and after a human check the results export as a table.
- **Hiking Planner**: import a route, read distance, climb and resupply segment by segment, and log the hike once it is done.
- **The Midnight Ledger**: a wuxia mystery RPG prototype: walk around a small town, question people, collect clues, and confront the suspect face to face.
- **Murder Mystery Table**: a murder mystery you can play alone, with an AI host and AI characters who search for evidence, discuss and vote with you.
- An unannounced project, in agentic investment research.

Some projects sprout early and grow slowly; others are the opposite, just as every flower in a garden is different. And I am the gardener: looking at this one today and that one tomorrow, wandering back and forth, watering them with ideas and tokens, and letting things take their course.

## The site's intro video

I made this short video with Claude 5.5: vertical, 40 seconds. The biggest thing I asked of it was that people who watch it would want to come and look around my site. The video is drawn in JavaScript on a Canvas, and every image in it comes from the site itself: the sleep data, the [talk's slides](../gallery/talks/pkm-2026-06-07/index.html) (in Chinese), the Work wheel, Sunny Day, the Endless Echoes route map, photos from articles, [Haba Snow Mountain](my-haba-snow-mountain-journey.en.html), and the covers from Favorites. At the end all the dots connect and become the site's name.

For the music, I wanted to borrow from [Sunny Day](../gallery/music/qingtian.html?lang=en) (晴天), an original song of mine from more than ten years ago. But the backing track I had is a slow song at 66 BPM that can't keep up with the video's pace, so in the end Claude took the key, chords and chorus melody of Sunny Day and rearranged them into a light, brisk piece. The lead instrument changed several times: the synth was too muffled, the violin didn't sound good, and it ended up as piano. Claude can't hear sound, so with every version it attached the spectrum figures it had measured, and I listened with my own ears and told it what was too loud and what was harsh.

To use the chorus melody, there had to be a score first. I finished writing Sunny Day in high school, and because I can't read music, the lyrics came first and the melody after. Later, in my first year of university, I wanted to enter a competition and sing it live, so through a friend I met an upperclassman who made original music (he had a duo at the time, NUAA D.C.), who arranged it for me. Through that I also learned quite a bit about recording and mixing, and that is how the first version on the site, from 2011, came about. The song was re-recorded in 2014 and played at the end of my school's graduation video.

The first score of this song ever put on paper was written down by my guitar teacher in university, and it was lost long ago. This time, for the background music, I could only ask AI (Claude 5.5 again) to work it back out from the recording. The method was to use the backing track to cancel it out of the mix, isolate the vocal, and then match it note by note. It took three drafts: the first, by my ear, was about 95 percent right, and the main problem was that it cut runs and slides into several separate notes; the next two drafts were spent fixing that. The score is now on [the Sunny Day page](../gallery/music/qingtian.html?lang=en#score-title) too, where you can download it as numbered notation, MusicXML and MIDI.

There really are many stories and memories around this song, and while I was making all this over the past two days they came back to mind. It felt like fishing a few certain, beautiful things out of a hazy past.

## connecting the dots.

When Claude made the first version of the video, without any obvious hint from me, it seized on dots, an image that runs through so much here. Each night of sleep data at the start is a dot; every work, every article, every favorite is a dot; and each song in Endless Echoes is a dot as well. It is these dots that make up who I was, am and will be. Yes, this site is about my past, present and future.
