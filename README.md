# redis-json-set

A library to manipulate json strings directly in redis.

- [Introduction](#introduction)
- [Usage](#usage)
- [Tests](#unit-tests)
- [Benchmark](#benchmark)
- [Limitations](#limitations)

## Introduction

Suppose you have to keep json string in redis for some reason (i.e. it might be inside a hash already and you can't really create deep structures in redis), and you want to change a single json key value. How do you do that? The first idea which comes to mind is to get data from redis, then parse object, change key, and set it back to redis. However, this approach has a number of disabvatages:

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

Or, if json object is within a redis's hash field:

```javascript
// suppose we have a json object in hash key `hash-map` under key `key-1`
redisClient.hset("hash-map", "key-1", `{"foo":"bar","foo1":"bar1","foo2":2}`);
const result = await redisJson.setHashKey("hash-map", "key-1", "foo2", "bar2");
// now json object is equal to {"foo":"bar","foo1":"bar1","foo2":"bar2"}
```

You can also use `incrKey` and `incrHashKey` methods to increase json key value by 1. Note that key value must be either a number or a string convertible to number for this to work:

```javascript
// suppose we have a json object at redis key `test-json-object`
redisClient.set("test-json-object", `{"foo":"bar","foo1":"bar1","foo2":2}`);
const result = await redisJson.incrKey("test-json-object", "foo2");
// now `"test-json-object"` is equal to {"foo":"bar","foo1":"bar1","foo2":3}

// this also works
redisClient.set("test-json-object", `{"foo":"bar","foo1":"bar1","foo2":"2"}`);
const result = await redisJson.incrKey("test-json-object", "foo2");
// now `"test-json-object"` is equal to {"foo":"bar","foo1":"bar1","foo2":"3"}

// this works for hash keys
redisClient.hset("hash-map", "key-1", `{"foo":"bar","foo1":"bar1","foo2":2}`);
const result = await redisJson.incrHashKey("hash-map", "key-1", "foo2");
// now json object is equal to {"foo":"bar","foo1":"bar1","foo2":"3"}
```

## Unit Tests

You can run unit tests with `mocha`:

```bash
mocha
```

You might need to install it globally first:

```bash
npm i -g mocha
```

You can see test coverage using `nyc` too:

```bash
nyc mocha
```

## Benchmark

Here are some results of a benchmark showing performance of

1. redis - first get string from redis, then replace key with regular expression, then set it back to redis
2. json - do this using `redisJson.setKey` command
3. redis-with-json-parse - first get string from redis, then parse it, then change key, then stringify and set back to redis.

```bash
redis small-object: 3 keys: completed 33093 (get - regex replace - set) operations within 5000ms
json small-object: 3 keys: completed 61082 redisJson.setKey operations within 5000ms
redis-with-json-parse small-object: 3 keys: completed 34391 (get - parse - stringify - set) operations within 5000ms
------------------------
redis medium-object: 10 keys: completed 35608 (get - regex replace - set) operations within 5000ms
json medium-object: 10 keys: completed 64239 redisJson.setKey operations within 5000ms
redis-with-json-parse medium-object: 10 keys: completed 33460 (get - parse - stringify - set) operations within 5000ms
------------------------
redis large-object: 50 keys: completed 34133 (get - regex replace - set) operations within 5000ms
json large-object: 50 keys: completed 45134 redisJson.setKey operations within 5000ms
redis-with-json-parse large-object: 50 keys: completed 28803 (get - parse - stringify - set) operations within 5000ms
------------------------
redis very-large-object: 500 keys: completed 19552 (get - regex replace - set) operations within 5000ms
json very-large-object: 500 keys: completed 17026 redisJson.setKey operations within 5000ms
redis-with-json-parse very-large-object: 500 keys: completed 6963 (get - parse - stringify - set) operations within 5000ms
------------------------
redis gigantic-object: 5000 keys: completed 2591 (get - regex replace - set) operations within 5000ms
json gigantic-object: 5000 keys: completed 1089 redisJson.setKey operations within 5000ms
redis-with-json-parse gigantic-object: 5000 keys: completed 782 (get - parse - stringify - set) operations within 5000ms
```

As you can see from the tests, `redis-json-set` is almost always faster. Only with very big objects stored in redis it gets slower than that, but then most time is taken by regex, which seem to be faster in node than in redis's lua. But even then if you always parse you data from redis, it will still be slower.

A new command to let you change multiple keys at once in redis is currently in the works.

## Limitations

- You can only change one json key at a time
- Json keys are matched by regex, and how deep key is nested does not matter. If you have multiple keys with same name in your json object, all will be set / incremented. So generally, you should avoid using this library if you have multiple keys with same names (e.g. arrays of instances of the same data class). This might be improved in future.
- You can only increment keys by 1. This will be changed in future.
