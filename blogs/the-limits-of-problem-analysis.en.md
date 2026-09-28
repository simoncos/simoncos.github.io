---
tags: thinking,hack
date: 2026-09-28
updated: 2026-09-28
translation: Claude Opus 5.5
description: Starting from the way one game bot works: black boxes, levels of analysis and where a problem should end. The first rule of analysis is to come back with a finite result.
written: Date unknown
---

# The Limits of Problem Analysis

A while ago a friend told me how someone had built a bot for an RPG. It was so interesting that it stuck with me, and I kept telling myself I had to write it down one day.

The bot works like this. It watches the colour of one particular point on the bar that shows the character's HP or MP on screen. If the colour changes in one direction (picture it going from red or blue to grey), health has dropped below some threshold, and the bot automatically enters the command to heal. If the colour changes the other way, it does nothing.

I had never thought about how game bots are made, so this was the first time I heard that one could be built this way. I found it fascinating, because it is a situation where you know nothing about a system's internal logic and work only on its final output to decide what to input next.

Thinking about it now, a bot simply takes over part of the work of a person's eyes, brain and hands. Watching the health bar and deciding whether to heal is far too simple a job for a person. Much better to hand it to a computer, which is dumb but also unlikely to make dumb mistakes.

Automation isn't really my point, though. What interests me is this way of taking a system apart. The logic inside a game is, in a sense, a black box. But whatever is in there, to get through the game at all it has to leave input and output interfaces for the **human**, so that person and machine together make up a complete game system. The bot exploits exactly this. Its ambition is not to crack all of the system's internal logic and put it to use. It simply takes hold of part of the system's output (the colour of one point in the game image) and sets up a simple, explicit rule for what to input. That frees the person from this small, simple loop to put their abilities into something more complex and more interesting. It is a textbook case of modular thinking.

Then I remembered something from a MOOC I took on Coursera a while back, *The Data Scientist's Toolbox*. In data science, the analysis and research we do on data can be divided into types by its goal (or, put another way, by the final result it aims for), and the difficulty varies accordingly. The easiest is descriptive analysis, whose goal is only to describe the data you see. The hardest is mechanistic analysis, whose goal is to fully understand the system that produced the data: exactly which variables changed in each individual, and exactly what other changes those caused. The other types of analysis sit between these two poles.

Let me offer a simple, if perhaps not very apt, example. Say I see a pear (my brain receives some data about it). Descriptive analysis only asks me to record its shape, colour, size and so on accurately. Mechanistic analysis asks me to work out why this pear has this shape, colour and size, and how shape, colour and size relate to each other (if the pear were bigger, would its shape and colour change?). And if all that holds for this pear, would our conclusions (the model we built) still be right for another one?

Ideally we would want results at the level of mechanistic analysis: to pick out, clearly and precisely, the flap of one butterfly's wings inside a hurricane. In practice, though, **the information we can get hold of is always far too little**. With the pear, what the eyes alone can take in is very little data. And what about now, in an age that produces enormous amounts of data? There is more data, certainly, but extracting information from it has become harder too. At times like this we have to rein in our greed and advance one step at a time.

Sometimes, too, having weighed cost against return, we decide that studying a problem to a certain depth and breadth already meets our needs, as with that bot. Then we should, of course, have the sense to spend the remaining resources where they count.

To analyse a problem system well, you certainly need the focus and persistence to get to the bottom of it. But we have to keep reminding ourselves that in the rough real world, the problem we are solving must have a boundary, one that keeps us from losing the way back while we dig our tunnel. **The first rule of analysis is to come back with a finite result.** This is a limit we cannot get around.

PS. Here is the [PDF on types of analysis](https://d396qusza40orc.cloudfront.net/datascitoolbox/lecture_slides/03_01_typesOfQuestions.pdf) from The Data Scientist's Toolbox. It has a few illustrative examples too, if you are curious.

---

An older post, added to this site on 2026-09-28. The original date of writing is unknown, and the text keeps its original wording.
