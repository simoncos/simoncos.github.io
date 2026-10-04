---
tags: hack
date: 2018-10-31
updated: 2026-10-04
description: 不重启服务也能更新配置和模型：用 cachetools 的 TTLCache 做定时热更新，用 functools 的 lru_cache 做即时热更新，以及多线程和 import 带来的问题。
series: Python功能点实现
series_part: 1
---

# Python功能点实现：数据热更新

关键词：热更新 | 热重载 | 定时更新 | 即时更新 | 缓存 | functools | cachetools | LRU | TTL

- [本文代码的Github地址](https://github.com/simoncos/practical-python/tree/master/features/hot-reloading)
- [v2ex上关于本文的一些讨论](https://www.v2ex.com/t/527725)

假设应用需要加载一个配置文件`config.txt`，一般的做法类似于：

```python
with open('config.txt') as f:
    parameters = f.read()
```

接下来`parameters`中存储的数据就可以被其他代码使用，但是这样写的话程序每次启动后，数据是固定死的，无法动态地自我更新，每次要修改配置/模型只能重启整个应用。

本文中热更新的意思是在应用运行时内，从外部（如文件、数据库、REST API）中获得数据并更新应用内的Python对象。应用场景一般是应用作为服务（有对外的API），需要在**不重启**的前提下更新自己的配置参数或者算法模型。

热更新可以分为两种：**定时更新（periodic update）**和**即时更新（on-call update）**，前者周期性地、主动地执行更新，后者则是被动地等待，直到接收到某种来自应用外部的信号才会执行更新。本文将通过内存缓存（Memory Cache）和装饰器（Decorator）技术来实现两种热更新。

### 内存缓存

先来说明一下内存缓存。缓存中的数据一般以键值对（key-value pair）的形式存在，value中放数据本身，key中放数据的某种描述名。缓存的**容量**决定了其最大可容纳的数据条数，当容量已满时再向缓存中存入新的数据，缓存就会采取开始**清理行为**：清除掉已存的部分数据，从而为新数据腾地方。**清理的策略**（判定何时需要清理、具体如何清理数据）有很多种，决定了缓存的不同类型。

Python中缓存常被写成**装饰器的形式**，缓存数据的`key`里放的是被装饰原函数的参数值组合（`key`的生成方法可以不同，后面还会提到），`value`里放的则是原函数的返回值。这样**当函数被调用时**，程序会先去缓存数据里找是不是已经有相同的参数值，如果有就直接返回已缓存的返回值，不重复进行原函数内的计算。

注意缓存的使用有一个**隐含前提**：函数本身是无状态的。假如函数内引用了全局变量，或者存在闭包，那同样的参数值不一定必然计算出相同的返回值。这样缓存的返回值和实际期望的返回值就不一定一致了。

### 定时热更新

定时更新的实现使用了来源于第三方库[cachetools](https://cachetools.readthedocs.io/en/latest/)的`TTLCache`，TTL（Time-to-Live）指**存在时长策略**。这种缓存为每一条存入的数据记录其存在的时长。每次调用都会检查是否存在超过某个设定时长阈值的数据，如果有就会开始清理行为：所有超时数据都会被清除掉；如果没有超时数据，缓存将会换用LRU策略，使缓存不超出容量大小（下一部分会提到LRU的具体策略）。

当我们将TTL缓存的容量设为1时、且用于加载数据的原函数参数不变的情况下，逻辑就变成了定时更新：

- 未超过时长：缓存保留，每次调用都使用缓存数据
- 超过时长，缓存清空（只有一条数据），程序重新计算（在这里即重新加载数据）

示例代码如下（运行需要安装`cachetools`，并在文首链接里下载完整的项目）：

```python
import time
import cachetools

from utils import change_conf_file

ROTATE = 5

@cachetools.cached(cachetools.TTLCache(1, ROTATE))
def reload():
    print('Cache cleared, reloading config...')
    with open('config.txt') as f:
        parameters = f.read()
    return parameters

class Model():
    def log(self):
        self.model = reload()
        print(self.model)

if __name__ == '__main__':
    # Reload automatically every [ROTATE] seconds
    model = Model()
    while True:
        time.sleep(2)
        change_conf_file() # change data
        model.log()
```

### 即时热更新

即时更新的实现使用了来源于Python内置库[functools](https://docs.python.org/3/library/functools.html)的`lru_cache`，LRU（Least Recently Used）指**最少使用策略**。这种缓存为每一条存入的数据记录其被使用的次数，每次调用都会检查缓存大小是否超出容量，如超出就会开始清理行为：会从使用次数最少的数据开始清理，直到缓存大小处于容量以内。

当我们将LRU缓存的容量设为1、且用于加载数据的原函数参数不变的情况下，原函数只有在第一次被调用时才会发生计算，之后调用都会直接返回缓存中的数据，到这里与一般的读取效果上并无区别。当我们需要热更新数据的时候，只需要主动清空缓存。如下例中`Getter.getModel.cache_clear()`。其中`Getter.getModel`是装饰后的函数，其中带有用于清理缓存的函数`cache_clear()`。有了这个扳机，我们只需要**额外开发一个API（比如REST下的GET）来触发它**，这样通过外部即时call API就可以进行热更新了。

示例代码如下（运行需要在文首链接里下载完整的项目）：

```python
import time
from functools import lru_cache

from utils import change_conf_file

class Getter:
    @staticmethod
    @lru_cache(1)
    def getModel():
        with open('config.txt') as f:
            model = f.read()
        return model

class Model():
    def log(self):
        self.model = Getter.getModel()
        print(self.model)

if __name__ == '__main__':
    # Reload only when cache_clear() is called
    model = Model()
    while True:
        model.log()
        time.sleep(2)
        change_conf_file() # change data
        Getter.getModel.cache_clear()
        print('Cache cleared, reloading config...')
        model.log()
```

这里补充一个细节，上面的示例中被缓存装饰器装饰的原函数`getModel`是一个**无参数的函数**，这种情况下`lru_cache`是如何运作的呢？`lru_cache`的实现中使用函数`functools._make_key`来生成缓存的`key`。在Python中，当原函数无参数时，默认参数`args`可认为是空元组`()`，可选参数可认为是空字典`{}`，在这种情况下生成的`key`将会是空列表`[]`（注意列表是不可hash的，不可直接作为字典的key，functools里的实际数据结构较为复杂，这里没有深入）。上一部分提到的第三方库`cachetools`实现了类似的方法`keys.typedkey`，两者生成的`key`存在区别，但是结合其他方法，行为在大部分情况是一样的，包括本文中的无参数函数情况。

```python
import time
from functools import _make_key
from cachetools.keys import typedkey

if __name__ == '__main__':
    print(_make_key((), {}, False)) # []
    print(typedkey((), {}, False)) # ((), {}, <class 'tuple'>, <class 'dict'>)
```

### 扩展问题

- **多线程情况**：本文的热更新方法均基于缓存，而由于缓存涉及到读写操作，在多线程环境下我们需要考虑其正确性。<del>`functools.lru_cache`和`cachetools.TTLCache`里均有使用到锁的机制，再考虑到Python的GIL锁，本文所述的热更新在线程安全上应该算是有保障的，但目前未经试验无法完全下断言。</del>更正：`functools.lru_cache`的文档中提到[多线程环境下hit和miss的计数只是近似值](https://docs.python.org/3/library/functools.html#functools.lru_cache)，而cachetools的文档中则明确提到`cachetools.TTLCache`[这样的类是非线程安全的](https://cachetools.readthedocs.io/en/stable/#cache-implementations)，[需要额外提供锁以实现同步](https://cachetools.readthedocs.io/en/stable/#cachetools.cached)。最开始写这篇文章的时候我对GIL的理解有误，按我现在的理解，GIL宽泛地讲只会阻止多线程调用多个CPU，但同一个CPU下的多线程仍然是有效的（不然还要多线程干嘛），所以同步的问题还是要考虑清楚。
- **import**：假如我们在一个模块（module）里更新model，而另一个模块`import`这个model，那么当原模块的model热更新后，`import`得到的model并不会更新，这种行为可能与Python自身的[module cache](https://docs.python.org/3/reference/import.html#the-module-cache)有关。要实现所有module的热更新，能考虑的一个办法是让数据自己成为一个模块，[使其变得可以在模块之间共享](https://docs.python.org/3/faq/programming.html#how-do-i-share-global-variables-across-modules)。

---

吐槽：这篇写得我浑身无力啊，本来觉得很简单，就平时用的小东西拿来拎拎清，没想到越拎越深...很多时候我们很happy是因为我们站在冰山的最上面，不用面对水下的魔鬼细节...作为搞技术的，我们还是不能光看脸，也要多盯裆(≖＿≖)✧
