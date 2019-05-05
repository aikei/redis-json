# redis-json-set

[![Build Status](https://travis-ci.org/aikei/redis-json.svg?branch=master)](https://travis-ci.org/aikei/redis-json)
[![Coverage Status](https://coveralls.io/repos/github/aikei/redis-json/badge.svg)](https://coveralls.io/github/aikei/redis-json)

A library to manipulate json strings directly in redis.

- [Introduction](#introduction)
- [Usage](#usage)
- [Tests](#unit-tests)
- [Benchmark](#benchmark)
- [Limitations](#limitations)
- [Release Notes](#release-notes)

## Introduction

Suppose you have to keep json string in redis for some reason (i.e. it might be inside a hash already and you can't really create deep structures in redis). And suppose you want to change value of a single json key. How do you do that? The first idea which comes to mind is to get data from redis, then parse object, change key, and set it back to redis. However, this approach has a number of disadvatages:

1. Obviously, speed. If you have to do such operations often, there will be some overhead.
2. Concurrency issues. Suppose you got your object from redis, then value of that object changed before you set it back to redis. Redis value will be overwritten with your value, losing the change which happened between your get and set operations.

So, how to solve it? The only way to do it, is to change json directly in redis, with lua scripts, and that's what this library is doing: simplifies this for you. However, see [Limitations](#limitations).

## Usage

Install library:

```
npm i redis-json-set
```

First create a new redisJson object:

```javascript
const RedisJson = require("redis-json-set");

const redisJson = new RedisJson(); // this will use default redis connection settings

const redisJson = new RedisJson({ // this will use your provided settings to connect to redis
    redis: {
        host: "123.456.23.545",
        port: 6400,
        password: "foo"
    }
}); // this will use your provided settings to connect to redis

const redisClient = redis.createClient();
// this will use existing redis connection
const redisJson = new RedisJson({ redisClient: redisClient });
// init redisJson object. wait for promise returned by init to resolve
await redisJson.init();
```

Now, to change json key value:

```javascript
// suppose we have a json object at redis key `test-json-object`
redisClient.set("test-json-object", `{"foo":"bar","foo1":"bar1","foo2":2}`);
const result = await redisJson.setKey("test-json-object", "foo2", "bar2");
// now `"test-json-object"` is equal to {"foo":"bar","foo1":"bar1","foo2":"bar2"}
```

To change multiple values in the same json object at once:

```javascript
// suppose we have a json object at redis key `test-json-object`
redisClient.set("test-json-object", `{"foo":"bar","foo1":"bar1","foo2":2}`);
const result = await redisJson.setKey("test-json-object", "foo2", "bar2", "foo","barX);
// now `"test-json-object"` is equal to {"foo":"barX","foo1":"bar1","foo2":"bar2"}
```

Or, if json object is within a redis's hash field:

```javascript
// suppose we have a json object in hash key `hash-map` under key `key-1`
redisClient.hset("hash-map", "key-1", `{"foo":"bar","foo1":"bar1","foo2":2}`);
const result = await redisJson.setHashKey("hash-map", "key-1", "foo2", "bar2");
// now json object is equal to {"foo":"bar","foo1":"bar1","foo2":"bar2"}
```

To change multiple values in the same json object at once:

```javascript
// suppose we have a json object in hash key `hash-map` under key `key-1`
redisClient.hset("hash-map", "key-1", `{"foo":"bar","foo1":"bar1","foo2":2}`);
const result = await redisJson.setHashKey("hash-map", "key-1", "foo2", "bar2", "foo", "barX");
// now json object is equal to {"foo":"barX","foo1":"bar1","foo2":"bar2"}
```

You can also use `incrKey` and `incrHashKey` methods to increase json key value by 1. Note that key value must be either a number or a string convertible to number for this to work:

```javascript
// suppose we have a json object at redis key `test-json-object`
redisClient.set("test-json-object", `{"foo":"bar","foo1":"bar1","foo2":2}`);
const result = await redisJson.incrKey("test-json-object", "foo2", 1);
// now `"test-json-object"` is equal to {"foo":"bar","foo1":"bar1","foo2":3}

// this also works
redisClient.set("test-json-object", `{"foo":"bar","foo1":"bar1","foo2":"2"}`);
const result = await redisJson.incrKey("test-json-object", "foo2", 1);
// now `"test-json-object"` is equal to {"foo":"bar","foo1":"bar1","foo2":"3"}

// this works for hash keys
redisClient.hset("hash-map", "key-1", `{"foo":"bar","foo1":"bar1","foo2":2}`);
const result = await redisJson.incrHashKey("hash-map", "key-1", "foo2", 1);
// now json object is equal to {"foo":"bar","foo1":"bar1","foo2":3}

// you can also specify value to increment other than 1
redisClient.set("test-json-object", `{"foo":"bar","foo1":"bar1","foo2":2}`);
const result = await redisJson.incrKey("test-json-object", "foo2", 2);
// now `"test-json-object"` is equal to {"foo":"bar","foo1":"bar1","foo2":4}

redisClient.hset("hash-map", "key-1", `{"foo":"bar","foo1":"bar1","foo2":2}`);
const result = await redisJson.incrHashKey("hash-map", "key-1", "foo2", 2);
// now json object is equal to {"foo":"bar","foo1":"bar1","foo2":4}
```

You can also increment multiple fields at once:

```javascript
redisClient.set("test-json-object", `{"foo":"bar","foo1":10,"foo2":2}`);
const result = await redisJson.incrKey("test-json-object", "foo1", 10, "foo2", 1);
// now `"test-json-object"` is equal to {"foo":"bar","foo1":20,"foo2":3}

redisClient.hset("hash-map", "key-1", `{"foo":"bar","foo1":10,"foo2":2}`);
const result = await redisJson.incrHashKey("hash-map", "key-1", "foo1", 10, "foo2", 2);
// now json object is equal to {"foo":"bar","foo1":20,"foo2":4}
```

## Unit Tests

You can run mocha unit tests with:

```bash
npm test
```

You can see test coverage using `nyc` too:

```bash
nyc npm test
```

## Benchmark

Here are some results of a benchmark showing performance of

1. redis-with-regex - first get string from redis, then replace key with regular expression, then set it back to redis
2. redis-json-set - do this using `redisJson.setKey` command
3. redis-with-json-parse - first get string from redis, then parse it, then change key, then stringify and set back to redis.

Benchmark was ran for 5 different object sizes while changing 1 to 5 keys at once:

```bash
========= change 1 key(s) benchmark:
? object size: 122 bytes
redis-with-regex small-object: 3 keys: completed 44090 (get - regex replace - set) operations within 5000ms
redis-json-set small-object: 3 keys: completed 71102 redisJson.setKey operations within 5000ms
redis-with-json-parse small-object: 3 keys: completed 42421 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 405 bytes
redis-with-regex medium-object: 10 keys: completed 43191 (get - regex replace - set) operations within 5000ms
redis-json-set medium-object: 10 keys: completed 67439 redisJson.setKey operations within 5000ms
redis-with-json-parse medium-object: 10 keys: completed 41502 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 2027 bytes
redis-with-regex large-object: 50 keys: completed 41161 (get - regex replace - set) operations within 5000ms
redis-json-set large-object: 50 keys: completed 47193 redisJson.setKey operations within 5000ms
redis-with-json-parse large-object: 50 keys: completed 31840 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 20250 bytes
redis-with-regex very-large-object: 500 keys: completed 21401 (get - regex replace - set) operations within 5000ms
redis-json-set very-large-object: 500 keys: completed 10069 redisJson.setKey operations within 5000ms
redis-with-json-parse very-large-object: 500 keys: completed 7374 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 202655 bytes
redis-with-regex gigantic-object: 5000 keys: completed 2601 (get - regex replace - set) operations within 5000ms
redis-json-set gigantic-object: 5000 keys: completed 1101 redisJson.setKey operations within 5000ms
redis-with-json-parse gigantic-object: 5000 keys: completed 772 (get - parse - stringify - set) operations within 5000ms

========= change 2 key(s) benchmark:
? object size: 121 bytes
redis-with-regex small-object: 3 keys: completed 44918 (get - regex replace - set) operations within 5000ms
redis-json-set small-object: 3 keys: completed 70452 redisJson.setKey operations within 5000ms
redis-with-json-parse small-object: 3 keys: completed 42301 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 401 bytes
redis-with-regex medium-object: 10 keys: completed 42406 (get - regex replace - set) operations within 5000ms
redis-json-set medium-object: 10 keys: completed 61799 redisJson.setKey operations within 5000ms
redis-with-json-parse medium-object: 10 keys: completed 37743 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 2030 bytes
redis-with-regex large-object: 50 keys: completed 38801 (get - regex replace - set) operations within 5000ms
redis-json-set large-object: 50 keys: completed 34707 redisJson.setKey operations within 5000ms
redis-with-json-parse large-object: 50 keys: completed 32044 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 20261 bytes
redis-with-regex very-large-object: 500 keys: completed 19687 (get - regex replace - set) operations within 5000ms
redis-json-set very-large-object: 500 keys: completed 6007 redisJson.setKey operations within 5000ms
redis-with-json-parse very-large-object: 500 keys: completed 7186 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 202716 bytes
redis-with-regex gigantic-object: 5000 keys: completed 2618 (get - regex replace - set) operations within 5000ms
redis-json-set gigantic-object: 5000 keys: completed 599 redisJson.setKey operations within 5000ms
redis-with-json-parse gigantic-object: 5000 keys: completed 746 (get - parse - stringify - set) operations within 5000ms

========= change 3 key(s) benchmark:
? object size: 125 bytes
redis-with-regex small-object: 3 keys: completed 43826 (get - regex replace - set) operations within 5000ms
redis-json-set small-object: 3 keys: completed 70103 redisJson.setKey operations within 5000ms
redis-with-json-parse small-object: 3 keys: completed 42815 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 407 bytes
redis-with-regex medium-object: 10 keys: completed 42052 (get - regex replace - set) operations within 5000ms
redis-json-set medium-object: 10 keys: completed 54396 redisJson.setKey operations within 5000ms
redis-with-json-parse medium-object: 10 keys: completed 40553 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 2029 bytes
redis-with-regex large-object: 50 keys: completed 39055 (get - regex replace - set) operations within 5000ms
redis-json-set large-object: 50 keys: completed 26965 redisJson.setKey operations within 5000ms
redis-with-json-parse large-object: 50 keys: completed 30612 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 20239 bytes
redis-with-regex very-large-object: 500 keys: completed 17306 (get - regex replace - set) operations within 5000ms
redis-json-set very-large-object: 500 keys: completed 4251 redisJson.setKey operations within 5000ms
redis-with-json-parse very-large-object: 500 keys: completed 6880 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 202693 bytes
redis-with-regex gigantic-object: 5000 keys: completed 2564 (get - regex replace - set) operations within 5000ms
redis-json-set gigantic-object: 5000 keys: completed 423 redisJson.setKey operations within 5000ms
redis-with-json-parse gigantic-object: 5000 keys: completed 764 (get - parse - stringify - set) operations within 5000ms

========= change 4 key(s) benchmark:
? object size: 124 bytes
redis-with-regex small-object: 3 keys: completed 41941 (get - regex replace - set) operations within 5000ms
redis-json-set small-object: 3 keys: completed 64242 redisJson.setKey operations within 5000ms
redis-with-json-parse small-object: 3 keys: completed 42480 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 406 bytes
redis-with-regex medium-object: 10 keys: completed 42356 (get - regex replace - set) operations within 5000ms
redis-json-set medium-object: 10 keys: completed 52923 redisJson.setKey operations within 5000ms
redis-with-json-parse medium-object: 10 keys: completed 40413 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 2035 bytes
redis-with-regex large-object: 50 keys: completed 37593 (get - regex replace - set) operations within 5000ms
redis-json-set large-object: 50 keys: completed 22813 redisJson.setKey operations within 5000ms
redis-with-json-parse large-object: 50 keys: completed 32103 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 20261 bytes
redis-with-regex very-large-object: 500 keys: completed 17872 (get - regex replace - set) operations within 5000ms
redis-json-set very-large-object: 500 keys: completed 3323 redisJson.setKey operations within 5000ms
redis-with-json-parse very-large-object: 500 keys: completed 7065 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 202632 bytes
redis-with-regex gigantic-object: 5000 keys: completed 1862 (get - regex replace - set) operations within 5000ms
redis-json-set gigantic-object: 5000 keys: completed 325 redisJson.setKey operations within 5000ms
redis-with-json-parse gigantic-object: 5000 keys: completed 764 (get - parse - stringify - set) operations within 5000ms

========= change 5 key(s) benchmark:
? object size: 125 bytes
redis-with-regex small-object: 3 keys: completed 41876 (get - regex replace - set) operations within 5000ms
redis-json-set small-object: 3 keys: completed 62949 redisJson.setKey operations within 5000ms
redis-with-json-parse small-object: 3 keys: completed 42462 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 406 bytes
redis-with-regex medium-object: 10 keys: completed 40756 (get - regex replace - set) operations within 5000ms
redis-json-set medium-object: 10 keys: completed 47596 redisJson.setKey operations within 5000ms
redis-with-json-parse medium-object: 10 keys: completed 40634 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 2035 bytes
redis-with-regex large-object: 50 keys: completed 36898 (get - regex replace - set) operations within 5000ms
redis-json-set large-object: 50 keys: completed 18643 redisJson.setKey operations within 5000ms
redis-with-json-parse large-object: 50 keys: completed 31231 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 20256 bytes
redis-with-regex very-large-object: 500 keys: completed 19028 (get - regex replace - set) operations within 5000ms
redis-json-set very-large-object: 500 keys: completed 2666 redisJson.setKey operations within 5000ms
redis-with-json-parse very-large-object: 500 keys: completed 7226 (get - parse - stringify - set) operations within 5000ms
------------------------
? object size: 202756 bytes
redis-with-regex gigantic-object: 5000 keys: completed 1642 (get - regex replace - set) operations within 5000ms
redis-json-set gigantic-object: 5000 keys: completed 264 redisJson.setKey operations within 5000ms
redis-with-json-parse gigantic-object: 5000 keys: completed 802 (get - parse - stringify - set) operations within 5000ms
```

You can run this benchmark yourself with

```bash
node ./benchmark/redis-json-vs-normal.js
```

As you can see from the tests, `redis-json-set` is always faster when objects are not too big and (or) if you do not change multiple keys at the same time.
    - If your object size is up to 500 bytes, `redis-json-set` is always faster than either of the two alternatives, even if you change 5 keys at a time.
    - If you change just 1 key at a time, `redis-json-set` is faster than `get - json parse - json stringify - set` even for a very big object of size 200KB and faster than `get - RegEx replace - set` for an object of size 2KB.
    - If you change 2 keys at a time, `redis-json-set` is faster than `get - json parse - json stringify - set` and has a comparable performance to `get - RegEx replace - set` for an object of size 2KB

## Limitations

- Json keys are matched by regex, and how deep the key is nested does not matter. That is, If you have multiple keys with same name in your json object, all will be set / incremented. So generally, you should avoid using this library if you have multiple keys with same names (for example, arrays of instances of the same data class). Another option might be to make sure one redis key contains only unique json keys.
- You can only change values of json objects, but NOT arrays.

## Release Notes

### v0.1.0
 - You can now set/increment multiple json keys at once.
 - You can now increment by any value, not just 1.
 - New benchmark data showing performance of setting more than 1 key at once, also added test object sizes.

### v0.0.2
 - First release
