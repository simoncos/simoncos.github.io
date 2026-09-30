---
tags: hack
date: 2016-05-19
updated: 2026-09-30
translation: Claude Opus 5.5
description: Exponential and power-law functions plotted in Python: they can look alike, but in log-log form the exponential is still a curve while the power law becomes a straight line.
---

# Comparing the Plots of Exponential and Power-Law Distributions

Exponential distributions and power-law distributions sometimes look quite alike, but they are in fact very different. I plotted the functions of the two distributions in Python to make this easy to see intuitively. As you can see, once the two functions are turned into log-log form (the math.log() I use here is the natural logarithm, ln), their plots are strikingly different.

In the comments I give the analytic expression behind each plot. Note also that because I approximate with a discrete set of points here, which amounts to sampling the distribution's curve, I can get a numerical mean for the power law; mathematically, a power law's mean exists only under certain conditions.

```python
import matplotlib.pyplot as plt
import math

%matplotlib inline
```


```python
# exponential distribution
# y = c ** x
x = list(range(1,100))
c = 0.9
y = [c**i for i in x]
print('mean: {}'.format(sum(y)/len(y))) # exponent has mean which equals to the exponent c
plt.plot(x,y)
plt.show()
```

    mean: 0.09090640793950629


![Exponential function, c = 0.9: for x from 1 to 99, the curve falls quickly from about 0.9 and lies almost flat on zero beyond x = 50](assets/images/exponential-vs-power-law-distributions/4b2b9498456127b8af94f355cad1efaf.png)


```python
# log-log exponential distribution
# y_ln = ln(c) * exp(x_ln)

x_ln = [math.log(i) for i in x]
y_ln = [math.log(i) for i in y]
plt.plot(x_ln,y_ln)
plt.show()
```


![Log-log form of the exponential function (another exponential function), c=0.9: with ln x from 0 to about 4.6 on the horizontal axis, the curve starts near 0 and falls ever faster, ending at about −10.4](assets/images/exponential-vs-power-law-distributions/c3897bdb846ea93773bc365b485bed9e.png)


```python
# power-law distribution
# y = x ** c

x = list(range(1,100))
c = -2
y = [i**c for i in x]
print('mean: {}'.format(sum(y)/len(y))) # power-law has no mean
plt.plot(x,y)
plt.show()
```

    mean: 0.016513978789746385


![Power-law function, a=-2: the curve drops sharply from 1 at x = 1 and lies almost flat on zero beyond x = 10](assets/images/exponential-vs-power-law-distributions/f7cad38019f7b927b0af0ef25c6bcb43.png)


```python
# log-log power-law distribution
# y_ln = c * x_ln

x_ln = [math.log(i) for i in x]
y_ln = [math.log(i) for i in y]
plt.plot(x_ln,y_ln)
plt.show()
```

![Log-log form of the power-law function (a straight line), c=-2: a straight line running down to the right from the origin, ending at about −9.2](assets/images/exponential-vs-power-law-distributions/2beb0a90d264febacafb9fbb76ce26b5.png)
