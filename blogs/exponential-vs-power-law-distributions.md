---
tags: hack
date: 2016-05-19
updated: 2026-09-30
description: 用 Python 画出指数函数与幂律函数的图像：两者有时看起来很相似，转成双对数形式后，指数函数仍是一条曲线，幂律函数成了一条直线。
---

# 指数分布与幂律分布的图像对比

指数分布（exponential distribution）和幂律分布（power-law distribution）有时看起来很是相似，但实际上极为不同。我用python做了两种分布的函数plotting，方便直观理解。可以看到，两种函数转化为双对数形式（这里我用的math.log()是自然对数ln）后图像差异非常明显。

注释里我给出了几个图分别对应的解析式，另外注意因为这里是用离散的点集近似，相当于对分布函数曲线的采样，所以可以得到一个power-law的数值mean，数学上power-law的均值存在须满足一些条件。

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


![指数函数, c = 0.9：x 从 1 到 99，曲线从 0.9 附近迅速下降，x 过 50 以后几乎贴着 0](assets/images/exponential-vs-power-law-distributions/4b2b9498456127b8af94f355cad1efaf.png)


```python
# log-log exponential distribution
# y_ln = ln(c) * exp(x_ln)

x_ln = [math.log(i) for i in x]
y_ln = [math.log(i) for i in y]
plt.plot(x_ln,y_ln)
plt.show()
```


![指数函数的双对数形式（又一个指数函数）, c=0.9：横轴 ln x 从 0 到约 4.6，曲线从 0 附近开始越降越快，末端约为 −10.4](assets/images/exponential-vs-power-law-distributions/c3897bdb846ea93773bc365b485bed9e.png)


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


![幂律函数, a=-2：曲线从 x = 1 处的 1 骤然下降，x 过 10 以后几乎贴着 0](assets/images/exponential-vs-power-law-distributions/f7cad38019f7b927b0af0ef25c6bcb43.png)


```python
# log-log power-law distribution
# y_ln = c * x_ln

x_ln = [math.log(i) for i in x]
y_ln = [math.log(i) for i in y]
plt.plot(x_ln,y_ln)
plt.show()
```

![幂律函数的双对数形式（一条直线）, c=-2：一条从原点向右下方延伸的直线，末端约为 −9.2](assets/images/exponential-vs-power-law-distributions/2beb0a90d264febacafb9fbb76ce26b5.png)
