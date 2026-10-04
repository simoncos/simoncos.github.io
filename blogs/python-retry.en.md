---
tags: hack
date: 2018-11-01
updated: 2026-10-04
translation: Claude Opus 5.5
description: Retry automatically on intermittent exceptions and raise once the limit is reached: first as a recursive function, then as a decorator that counts with nonlocal.
series: Python功能点实现
series_part: 2
---

# Python Features in Practice: Retry

Keywords: retry | exception handling | recursion | decorators | nonlocal

[The code for this article on GitHub](https://github.com/simoncos/practical-python/tree/master/features/retry)

Some programs depend on an external environment that is changeable and beyond their control, such as web crawlers. It is hard to account in the program for every exception the outside world can bring in, especially the ones that come and go. If the program then has an automatic retry mechanism, it undoubtedly saves a lot of trouble.

The retry mechanism implemented here records how many times it has retried after hitting an exception. If that number is below the allowed number of retries, it retries again; otherwise it raises the exception. The first part below is a function implementation; the second changes it slightly into a more flexible decorator implementation. The implementation only involves **exception handling, recursion and decorators**, and the examples are clear enough, so I won't waste words.

### Function implementation

```python
import time, random

MAXIMAL_RETRY = 3

# Function Method

def run():
    result = random.random() # generate random double from 0 to 1
    if result > 0.3:
        raise Exception(f'Wrong result: {result}')
    else:
        print(f'>> Success')
        return result

def run_with_retry(times=0):
    time.sleep(1)
    try:
        return run()
    except Exception as e:
        if times >= MAXIMAL_RETRY:
            print(f'>> Exceed maximal retry {MAXIMAL_RETRY}, Raise exception...')
            raise(e) # will stop the program without further handling
        else:
            times += 1
            print(f'>> Exception, Retry {times} begins...')
            return run_with_retry(times)

if __name__ == "__main__":
    while True:
        print('\nBegin new run...')
        time.sleep(1)
        result = run_with_retry()
        if result:
            print(f'Get result: {result}')
```

### Decorator implementation

```python
import time, random

MAXIMAL_RETRY = 3

def retry(func, times=0):
    def retried(*args, **kwargs):
        nonlocal times # closure
        time.sleep(1)
        try:
            result = func(*args, **kwargs)
            times = 0 # reset after success
            return result
        except Exception as e:
            if times >= MAXIMAL_RETRY:
                print(f'>> Exceed maximal retry {MAXIMAL_RETRY}, Raise exception...')
                raise(e) # will stop the program without further handling
            else:
                times += 1
                print(f'>> Exception, Retry {times} begins...')
                return retried(*args, **kwargs)
    return retried

@retry
def run_decorated():
    result = random.random() # generate random double from 0 to 1
    if result > 0.3:
        raise Exception(f'Wrong result: {result}')
    else:
        print(f'>> Success')
        return result

if __name__ == "__main__":
    while True:
        print('\nBegin new run...')
        time.sleep(1)
        result = run_decorated()
        if result:
            print(f'Get result: {result}')
```

Note: the keyword `nonlocal` binds the name `times` in the function `retried` to the parameter `times` of the enclosing function `retry`, somewhat like passing by reference. For a fuller explanation, see the [official Python documentation](https://docs.python.org/3/reference/simple_stmts.html#the-nonlocal-statement).

---

After the torment of the previous article, *Hot Reloading Data*, here is an easy one (this sentence exists to bring my public Jianshu articles up to 100,000 characters in total XD)
