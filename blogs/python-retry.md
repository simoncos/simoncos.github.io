---
tags: hack
date: 2018-11-01
updated: 2026-10-04
description: 遇到时有时无的异常就自动重试，超过次数再上抛：先用递归函数实现，再改成用 nonlocal 计数的装饰器。
series: Python功能点实现
series_part: 2
---

# Python功能点实现：重试机制

关键词：重试 | 异常处理 | 递归 | 装饰器 | nonlocal

[本文代码的Github地址](https://github.com/simoncos/practical-python/tree/master/features/retry)

有些程序的运行需要依赖多变而不可控的外部环境，比如网络爬虫。在程序中我们很难将所有外部引入的异常都考虑到，特别是那些时有时无的异常，这时如果程序有自动重试的机制，无疑可以省不少事。

本文实现的重试机制在遇到异常时会记录遇到异常后重试的次数，如果次数小于允许的重试次数，则进行下一次重试，否则将异常上抛。下面第一部分是函数实现，第二部分在前者基础上略作改动，变成了更灵活的装饰器实现。实现只涉及**异常处理、递归、装饰器**的知识，示例也足够明晰，因此不多费口舌。

### 函数实现

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

### 装饰器实现

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

注：关键字`nonlocal`的作用是让函数`retried`的变量名`times`绑定到外部函数`retry`的参数`times`，类似于引用传值。更详细说明可见[Python官方文档](https://docs.python.org/3/reference/simple_stmts.html#the-nonlocal-statement)。

---

经过上一篇《数据热更新》的折磨这篇来个简单的（这句话用于凑够简书已公开文章10万总字数XD)
