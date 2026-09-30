---
tags: design
date: 2014-01-04
updated: 2026-09-30
translation: Claude Opus 5.5
description: Which kinds of product suit use cases and which suit user stories, two ways of describing requirements, and how to tell a good user story. First shared as an internal email during an operations internship at Yihaodian.
---

# Digging into User Needs: Use Cases and User Stories

*Note: This was an internal email I shared when I was an operations intern at Yihaodian (1号店). It originally went on with two small made-up examples of using user stories to dig out real needs, but since they were mainly about that platform, I have taken them out here for now. I may do two more general examples later.*

In software development, **use cases** (see Figure 1) or **user stories** are often used to describe how users interact with a software product in a given scenario, and the flow they may go through while using it, and from there to derive the product's functional requirements. The former looks more at the different scenarios from a high level, while the latter centres on building a virtual user with concrete characteristics who stands for a group, and on the story of what happens as they use the product (or it may simply be a real user's real experience).

![A simple use case diagram of a restaurant: inside a box labelled "Restaurant (simplified)" are four use cases, Eat Food, Pay for Food, Drink Wine and Cook Food; the Food Critic actor on the left is linked to the first three, and the Chef actor on the right to Cook Food](assets/images/use-cases-and-user-stories/fa4d26f04ef52ecb61a4b707d7828637.jpg)

**Figure 1: A simple use case diagram of a restaurant (image source: the "Use case" article on Wikipedia)**

Original by Kishorekumar 62, redrawn by Marcel Douwe Dekker, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Use_case_restaurant_model.svg), CC BY-SA 3.0.

In my view, the use case method is better suited to products with many scenarios, many user roles and a broad range of functions. Our back-office system, for example, involves staff in different departments who handle different parts of the business, and one person often needs many functions and connects with other staff through them. To describe clearly how each role interacts with the system, a **use case diagram** is very practical.

**User stories**, on the other hand, suit systems where users have a fairly single purpose and the flow branches fairly little. Take the front end of our group-buying site: the user's ultimate goal is to buy something, and there are only three core steps: browse the page -> put the item in the cart -> pay. But does that mean such a system needs no further analysis? Of course not. Whether an e-commerce platform runs healthily and keeps improving, and whether it can support a good user experience, depends not on how rich its features are but on whether the features it offers do a good job of converting users at the few key steps. Data such as UV and conversion rate help us quantify how the system is performing, but they cannot give us the reasons, let alone the ways to improve.

What is the most fundamental reason a system performs well or badly? Whether users' needs are met. And users' needs come from their personal attributes: gender, age, personality, hobbies, experience and so on. These attributes drive what users need and how they behave. From this we can see how important CRM is. But while we don't yet have such rich user data and user analysis, how are we to get to know them? **User stories** are a very good way.

In fact, everyone already knows how to use **user stories**. We often say things like "If it were me, I'd find this promotion really dull" or "If my dear mother had to use it, she'd never find her way around." To tell a good story, we may need to do a few things:

1\. Work out who our protagonist is, what attributes they have, and what tendencies of behaviour those attributes give them;

2\. What kind of scene the story takes place in, and what its features and constraints are;

3\. Use the way of telling you are best at: you can rely on nothing but words, or draw a storyboard like a film script (if you're good enough at drawing), or even combine it with some more systematic flowcharts (as in Figure 2).

![An example of a user story map: on the left, the flow of a buyer, TOM, from the list page and the product detail page to placing and viewing an order; on the right, the flow of a seller, "Uncle Li", handling the order on the transaction management pages and setting up a bank account; each role has a headshot, an age and a location](assets/images/use-cases-and-user-stories/5dd272663d262a4c8e3cbdcde98fa520.jpg)

**Figure 2: An example of a user story map (image source: heidixie, *交互设计那些事儿*, "All About Interaction Design", in Chinese)**
