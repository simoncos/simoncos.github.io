---
tags: ai,thinking
date: 2019-02-01
updated: 2026-10-04
translation: Claude Opus 5.5
description: Why does regularization prevent overfitting? Start from the solution space and the information in training data that lies outside the true distribution: overfitting is memorizing that information too, and regularization shrinks the search space and cuts away the outlandish solutions.
---

# On Overfitting and Regularization in Machine Learning

*This question came up on my Zhihu timeline again: [What is the principle behind using regularization to prevent overfitting in machine learning?](https://www.zhihu.com/question/20700829/answer/587052674) (in Chinese). I had just finished a close reading of the regularization chapter of *Deep Learning*, so my fingers itched and I wrote down some of my understanding of overfitting and regularization. The next article in my [Problem Solving and Design series](problem-solving-and-design-1-situation.en.html) will also touch on this (working title "Optimizing Solutions and Complexity"), but my understanding of these questions has kept being refreshed over the past two years, so that article is still at the stage of collecting ideas.*

---

According to Wikipedia, [Regularization (mathematics)](https://en.wikipedia.org/wiki/Regularization_%28mathematics%29): In mathematics, statistics, and computer science, particularly in machine learning and [inverse problems](https://en.wikipedia.org/wiki/Inverse_problem), regularization is the process of adding information in order to solve an [ill-posed problem](https://en.wikipedia.org/wiki/Well-posed_problem) or to prevent [overfitting](https://en.wikipedia.org/wiki/Overfitting).

So by its very definition, regularization is the process of preventing overfitting by adding some kind of information.

Machine learning problems are basically optimization problems. The **model/parameters** define the space of solutions (also called the hypothesis space), the **optimization algorithm** is responsible for finding the optimal or a good-enough solution in that space, and the **objective/loss function** provides the measure of better and worse. The bigger the model's solution space, the more likely it is to contain the solution that is optimal for the problem itself (meaning it has learned the true generating process, or true distribution, of the data), but the harder the optimization/search becomes.

For supervised problems, a solution is a mapping from features to labels, and learning uses only the training data, yet **the optimum on the training data is often not the optimum on the test data**. Explaining why properly would drag in a lot more (the i.i.d. assumption, empirical risk, generalization error; see Li Hang's *Statistical Learning Methods*). But here is one angle: suppose the model we use offers a large enough solution space and the training data is finite. Then the space contains solutions that map every point in the training data exactly onto the right label. Such a mapping is not necessarily valid for test data, because it **takes into account all the information in the training data**, and some of that information comes from the true distribution we want to learn, while some belongs to the training data itself, such as a bias in some direction from poor sampling, or noise, random perturbations and outliers. The test data actually has the same problems.

To take a rather extreme example: the feature is a person's age and the label is height. If the solution space is big enough, we can find a solution like this: for every age value, record the corresponding height, and for age values outside the training set, do some simple interpolation (nearest-neighbour regression, say). **The training error can then reach 0** (ignoring the Bayes error). But suppose our training set is rather bad: by chance everyone in it is very tall, with legs 1.8 metres long, or the age and height of a mouse got mixed in. Then the result on the test set will be terrible. **This phenomenon of "memorizing information in the training set that lies outside the problem's true distribution" is what we call overfitting. The stronger it is, the more likely we get a small training error but a test error far larger than the training error.** To quantify the degree of overfitting, one possible way I can think of is to measure the difference between the errors on the two datasets. Concepts such as bias-variance and model complexity (VC dimension) all help in understanding overfitting further (many books cover them).

![Bias/variance, underfitting and overfitting, model complexity/solution space: a slide from Andrew Ng's machine learning course. Three curves fitting house price against size: a straight line (degree 1) underfits, with high bias; a quadratic is just right; a quartic passes through every point and overfits, with high variance](assets/images/overfitting-and-regularization/7a984f0ed6ea310975464b53f2f2d653.jpg)

Regularization methods can roughly all be seen as **stopping the learning algorithm from learning information outside the true distribution**, **shrinking the search space and cutting away the outlandish solutions**. In practice there are all sorts of ways to do it: add a constraint to the objective function (a regularization term; some people explain this as adding a prior), add random noise to the training data, use semi-supervised learning, share parameters across multiple tasks, use ensemble learning, and so on (see the "flower book", *Deep Learning*, which considers regularization and optimization algorithms perhaps the two most important problems in machine learning)

My personal understanding.
