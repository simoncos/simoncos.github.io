---
tags: hack
date: 2018-10-31
updated: 2026-10-04
translation: Claude Opus 5.5
description: Update configuration and models without restarting the service: periodic hot reloading with cachetools' TTLCache, on-call hot reloading with functools' lru_cache, and the problems that threads and import bring.
series: Python功能点实现
series_part: 1
---

# Python Features in Practice: Hot Reloading Data

Keywords: hot update | hot reloading | periodic update | on-call update | cache | functools | cachetools | LRU | TTL

- [The code for this article on GitHub](https://github.com/simoncos/practical-python/tree/master/features/hot-reloading)
- [Some discussion of this article on V2EX](https://www.v2ex.com/t/527725) (in Chinese)

Suppose an application needs to load a configuration file, `config.txt`. The usual way is something like:

```python
with open('config.txt') as f:
    parameters = f.read()
```

From then on, the data stored in `parameters` can be used by other code. But written this way, the data is fixed once the program starts and cannot update itself dynamically; every change to the configuration or model means restarting the whole application.

In this article, hot reloading means getting data from outside (a file, a database, a REST API) while the application is running and updating Python objects inside the application. The typical scenario is an application running as a service (with an external API) that needs to update its configuration parameters or algorithm model **without restarting**.

Hot reloading comes in two kinds: **periodic update** and **on-call update**. The former performs updates actively and periodically; the latter waits passively and updates only when it receives some signal from outside the application. This article implements both kinds with a memory cache and decorators.

### Memory cache

First, a word on memory caches. Data in a cache is usually stored as key-value pairs: the value holds the data itself, the key holds some descriptive name for it. A cache's **capacity** determines the maximum number of entries it can hold. When the cache is full and new data is stored, the cache starts **eviction**: it removes part of the stored data to make room for the new. There are many **eviction policies** (deciding when eviction is needed and how exactly to remove data), and they determine the different types of cache.

In Python, caches are often written **as decorators**. The cache `key` holds the combination of argument values of the decorated function (there are different ways of generating the `key`; more on that later), and the `value` holds the function's return value. So **when the function is called**, the program first looks in the cache for the same argument values; if they are there, it returns the cached return value directly instead of repeating the computation inside the function.

Note that using a cache rests on an **implicit premise**: the function itself is stateless. If the function refers to a global variable or has a closure, the same argument values will not necessarily compute the same return value, and the cached return value may then differ from the one actually expected.

### Periodic hot reloading

The periodic update uses `TTLCache` from the third-party library [cachetools](https://cachetools.readthedocs.io/en/latest/). TTL (time-to-live) refers to a **lifetime policy**. This cache records how long each stored entry has existed. On every call it checks whether any entry has exceeded a set lifetime threshold; if so, it starts eviction, and all expired entries are removed. If nothing has expired, the cache falls back on the LRU policy to keep within its capacity (the next part describes the LRU policy in detail).

When we set the TTL cache's capacity to 1 and the arguments of the function that loads the data stay the same, the logic becomes a periodic update:

- Lifetime not exceeded: the cache is kept, and every call uses the cached data
- Lifetime exceeded: the cache is cleared (it holds only one entry), and the program computes again (here, that means reloading the data)

Example code (to run it, install `cachetools` and download the full project from the link at the top):

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

### On-call hot reloading

The on-call update uses `lru_cache` from Python's built-in library [functools](https://docs.python.org/3/library/functools.html). LRU (least recently used) refers to a **least-used policy**. This cache records how many times each stored entry has been used. On every call it checks whether the cache size exceeds its capacity; if so, it starts eviction, removing data starting from the least-used entries until the cache size is within capacity.

When we set the LRU cache's capacity to 1 and the arguments of the function that loads the data stay the same, the function computes only the first time it is called; every later call returns the cached data directly, which so far is no different in effect from an ordinary read. When we need to hot-reload the data, we only have to clear the cache actively, as in `Getter.getModel.cache_clear()` in the example below. `Getter.getModel` is the decorated function, and it carries the function `cache_clear()` for clearing the cache. With this trigger in place, we only need to **develop one more API (a GET under REST, say) to fire it**, and an external, on-call API request can then hot-reload the data.

Example code (to run it, download the full project from the link at the top):

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

One more detail. In the examples above, the function decorated by the cache, `getModel`, **takes no arguments**. How does `lru_cache` work in that case? Its implementation uses the function `functools._make_key` to generate the cache `key`. In Python, when a function takes no arguments, the positional `args` can be taken as an empty tuple `()` and the keyword arguments as an empty dict `{}`, and the `key` generated in that case is an empty list `[]` (note that lists are not hashable and cannot be used directly as dict keys; the actual data structure in functools is more complicated, and I did not dig into it here). The third-party library `cachetools` mentioned in the previous part implements a similar method, `keys.typedkey`. The `key`s the two generate differ, but combined with the other methods, they behave the same in most cases, including the no-argument case in this article.

```python
import time
from functools import _make_key
from cachetools.keys import typedkey

if __name__ == '__main__':
    print(_make_key((), {}, False)) # []
    print(typedkey((), {}, False)) # ((), {}, <class 'tuple'>, <class 'dict'>)
```

### Further questions

- **Multithreading**: the hot reloading methods here are all based on caches, and since caches involve reads and writes, we need to consider their correctness in a multithreaded environment. <del>`functools.lru_cache` and `cachetools.TTLCache` both use locking, and taking Python's GIL into account as well, the hot reloading described here should be reasonably safe for threads, though without testing I cannot say so with full certainty.</del> Correction: the documentation of `functools.lru_cache` says that [in a multithreaded environment the hit and miss counts are only approximate](https://docs.python.org/3/library/functools.html#functools.lru_cache), while the cachetools documentation states plainly that classes such as `cachetools.TTLCache` [are not thread-safe](https://cachetools.readthedocs.io/en/stable/#cache-implementations) and [need a lock supplied for synchronization](https://cachetools.readthedocs.io/en/stable/#cachetools.cached). When I first wrote this article I misunderstood the GIL. As I understand it now, broadly speaking the GIL only stops multiple threads from using multiple CPUs; multithreading on a single CPU still works (otherwise why have threads at all), so synchronization still needs to be thought through clearly.
- **import**: if we update the model in one module and another module `import`s that model, the model obtained by `import` is not updated when the original module's model is hot-reloaded. This behaviour may have to do with Python's own [module cache](https://docs.python.org/3/reference/import.html#the-module-cache). To hot-reload across all modules, one option worth considering is to make the data a module of its own, [so that it can be shared between modules](https://docs.python.org/3/faq/programming.html#how-do-i-share-global-variables-across-modules).

---

A gripe: writing this one wore me out completely. I thought it would be simple, just sorting out a small thing I use every day, and the more I sorted the deeper it went... Much of the time we are happy because we stand on the very top of the iceberg and never have to face the devilish details below the waterline... As people who build technology, we still can't judge by the face alone; we have to keep an eye below the belt too (≖＿≖)✧
