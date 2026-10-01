---
tags: ai, hack, life
date: 2026-10-01
updated: 2026-10-01
description: Working with Codex on a charity gala's website, auction testing and data preparation. Some time saved, a few small mishaps, and thoughts on sharing context between people and agents.
translation: Codex (GPT-6)
---

# Lending a Hand at a Charity Gala, with Codex

![A blog cover adapted from the event website's artwork: many hands support children walking toward a bright doorway. The Chinese title reads “Lending a Hand at a Charity Gala, with Codex.”](assets/images/charity-gala-with-codex/cover.jpg)

I helped with Spring Blooms' annual charity gala again this year, and was glad to contribute in my own small way. This time I had a few AI helpers. Compared with last year, I spent less time and managed to do quite a bit more: building and deploying the event website, coordinating requirements and testing the auction system, maintaining auction item information, creating an online donation pledge form, writing promotional copy, and handling the various loose ends after the event.

Some of these were things I could have done before, just with more time. Others were things I only had room to take on because AI was helping. There were plenty of ways it made life easier, along with a few unexpected little episodes worth writing down.

First, the event website. The organizing team supplied the design, and I had Codex turn the Illustrator and PDF files into a webpage, adapt it for phones, and deploy a preview. We revised it from feedback and gradually added the event brochure, auction link and QR codes. A separate development team built the auction platform; Codex and I helped with requirements, data preparation and testing.

The webpage came together quickly, but getting the details right still took a few rounds. “Link to PDF,” an instruction in the design explaining how something should work, once ended up on the page as actual text. Photo crops, logo sizes and font sizes all needed individual adjustments. There was no mobile design, and shrinking the entire multi-column sponsor list to fit a phone made the names too small to read. So we rearranged the names and logos, then dealt with little things like a lone name on the last row that wasn't centered.

None of this was especially difficult, but there were lots of small pieces. Now I could point out what looked wrong, have Codex change and deploy it, then open it again to check. Most of the effort saved was in implementation, leaving me more attention for how the result actually looked.

Next came the auction item information. Excel files, PDFs, image folders, plus more details arriving in chats: as an event takes shape, file versions tend to multiply.

Once, the images and item numbers simply wouldn't line up. After some digging, we realized that the organizing team and we were looking at different spreadsheets. We settled on one location for the master file, archived the old versions, and based subsequent updates on that same sheet. That cut down a lot of back-and-forth checking. Codex handled batch field checks, incorrect image references, and comparisons between the PDF and Excel versions. Handing over that work certainly saved some eyestrain.

It could be a little too helpful, though. A “5000” appeared in the donor column of the original sheet. Codex decided it was probably the minimum bid increment and moved it there. A plausible guess, but nobody had confirmed it. After reviewing it, we left the relevant fields blank, put the guess in a note, and asked the organizing team to confirm.

I gradually leaned toward having it go through the material first, flag anything uncertain, and collect those questions for confirmation. It could help spot problems. Where we didn't yet know the answer, it was fine to leave it unknown for a while.

Images brought their own small troubles. Some files had a JPG extension but were actually PSDs. Some originals exceeded the upload limit. Tall paintings had their tops and bottoms cropped by the system. One attempt to process an image with generative AI even changed the lettering on the packaging. That obviously wouldn't do.

In the end, the most useful fixes were often simple: check the format, compress a copy, resize without changing the proportions, add white margins, and keep the original. Sometimes all it took to show a whole painting was a square white background.

Testing the auction system was another area where AI helped a lot. Codex could operate the admin interface through a browser, import items, then check the categories, images, details and bidding entry points on the public-facing side.

During testing, we found cases where the same item showed different amounts in the listing, detail page and default bid. Sometimes the amount was right when the page first opened, then jumped back to an old value a moment later. If we had stopped at the admin interface's “Import successful,” these would have been easy to miss.

Once it found a problem, Codex could assemble the item involved, the steps to reproduce it and screenshots. I passed those to the developers. After a fix, we went through the same steps again. That spared me a lot of repetitive clicking and made the issues easier to explain.

The reports themselves went through some trimming, too. One five-page report became a single page covering only the key issues that needed development work. If an image could be displayed properly by adding a white background, we could just take care of the image ourselves. With the event approaching, everyone had plenty on their plate. Clear, short feedback made it easier for the next person to pick things up.

Of course, the AI tools could also get stuck. Browser control repeatedly failed to connect at one point; investigation eventually showed that it was getting stuck while loading the tool's own configuration. A shared Excel file could be locked when someone else had it open, so we had to wait, get the latest version, and merge our changes. Some uploaded images also needed extra handling by the development team before they would display correctly.

In practice, people and agents often took turns: filling in information, checking details, and working through whatever new problem had appeared.

There was also a mistake worth remembering during the follow-up auction after the gala. We had initially considered reducing all remaining items' prices by 20%. I later changed the plan, but Codex still followed the old decision and discounted six items. When I noticed and pointed it out, it checked that no new bids had come in, then restored the prices.

That gave me a more concrete understanding of long conversations. Having the history available doesn't mean an agent can reliably tell which decisions are still in force. For changes to prices, timing, or whether an item is listed, restating the current plan before execution is still useful. Otherwise, the human has turned the page while the agent is diligently following instructions from a few pages back.

Later, we moved the paper pledge form into Google Forms, wrote copy for the follow-up auction, saved the results and prepared the handover. None of these tasks looked particularly big on its own, but together they took time. With AI helping, I really could spend less time on spreadsheets, webpages and repeated checks, and pick up a little more work than I otherwise might have managed.

Looking back, though, my strongest impression has two sides.

On one side, AI removed a great deal of friction from moving between systems and working with data, and lightened the testing and development load. Many things that used to feel laborious even to contemplate could now be started first and improved along the way.

On the other, the hardest part of the whole process was still that **the context wasn't connected**.

Event conversations happened on WeChat, scattered across different people and groups. Codex worked in several separate conversations. The auction platform's admin and public interfaces each showed another part of the current state.

So I had to bring new decisions from WeChat to Codex, organize the problems it found for the developers, bring their replies back for retesting, and finally relay the results to the organizing team.

A change might have been confirmed in a group chat while the document still said “awaiting confirmation.” The admin system might be updated while the spreadsheet wasn't. A plan might have been dropped while its old version remained in a long conversation. Before AI could help, I often had to piece that background together again.

When several parties are preparing an event together, it's natural for information to keep arriving as things develop. Being part of it gave me a more concrete sense of this: speeding up individual steps doesn't necessarily speed up the whole process by the same proportion. AI had taken on quite a bit of the execution, but connecting context across tools and conversations still needed a person.

The organizing and development teams kept supplying information, checking details and handling last-minute changes throughout. Their efforts were what allowed things to move forward. Working together like this also gave me a few thoughts about what might be possible in the future.

Suppose we started from first principles, temporarily set aside the boundaries of our existing tools and platforms, and let ourselves imagine freely. Could we do the same things more easily next time?

Perhaps people and agents could work together more naturally, with requirements, relevant knowledge, issue lists and current decisions continuously shared and updated in a common workspace. When a change was confirmed, the people and agents who needed it could know. When a problem was solved, the result could go back into the original record. When a new decision replaced an old plan, it wouldn't depend on someone remembering to mention it again.

Perhaps that would mean less time passing information around and checking it, leaving more attention for communication, judgment and the event itself.

Onward, without end!
