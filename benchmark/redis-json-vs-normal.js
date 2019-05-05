const redis = require("redis");
const RedisJson = require("../src");
const bluebird = require("bluebird");
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

async function runRedisBenchmarkSet(time, testObj, name, keyChanges = 1) {
    const redisClient = redis.createClient();
    await redisClient.flushallAsync();
    await redisClient.setAsync("test", JSON.stringify(testObj));
    let done = false;
    setTimeout(() => {
        done = true;
    }, time);
    let n = 0;
    const objectKeys = Object.keys(testObj);
    const randomKey = objectKeys[Math.floor(Math.random() * objectKeys.length)];
    while (!done) {
        let str = await redisClient.getAsync("test");
        for (let i = 0; i < keyChanges; i++)
            str = str.replace(new RegExp(`"${randomKey}":.*?([,}])`), `"${randomKey}":"new_value"$1`);
        await redisClient.setAsync("test", str);
        n++;
    }
    console.log("redis-with-regex %s: completed %s (get - regex replace - set) operations within %sms", name, n, time);
    redisClient.quit();
    return n;
}

async function runRedisBenchmarkSetWithParse(time, testObj, name) {
    const redisClient = redis.createClient();
    await redisClient.flushallAsync();
    await redisClient.setAsync("test", JSON.stringify(testObj));
    let done = false;
    setTimeout(() => {
        done = true;
    }, time);
    let n = 0;
    const objectKeys = Object.keys(testObj);
    const randomKey = objectKeys[Math.floor(Math.random() * objectKeys.length)];
    while (!done) {
        let str = await redisClient.getAsync("test");
        const obj = JSON.parse(str);
        obj[randomKey] = "new_value";
        await redisClient.setAsync("test", JSON.stringify(obj));
        n++;
    }
    console.log("redis-with-json-parse %s: completed %s (get - parse - stringify - set) operations within %sms", name, n, time);
    redisClient.quit();
    return n;
}

async function runRedisJsonBenchmarkSet(time, testObj, name, keyChanges = 1) {
    const json = new RedisJson();
    await json.init();
    const redisClient = redis.createClient();
    await redisClient.flushallAsync();
    await redisClient.setAsync("test", JSON.stringify(testObj));
    const objectKeys = Object.keys(testObj);
    const args = [];
    for (let i = 0; i < keyChanges; i++) {
        const randomKey = objectKeys[Math.floor(Math.random() * objectKeys.length)];
        args.push(randomKey);
        args.push("new_value");
    }
    
    let done = false;
    setTimeout(() => {
        done = true;
    }, time);
    let n = 0;
    while (!done) {
        await json.setKey("test", ...args);
        n++;
    }
    console.log("redis-json-set %s: completed %s redisJson.setKey operations within %sms", name, n, time);
    json.quit();
    redisClient.quit();
    return n;
}

function generateObject(nKeys) {
    const obj = {};
    for (let i = 0; i < nKeys; i++) {
        const key = String(Math.random());
        obj[key] = Math.random();
    }
    const length = JSON.stringify(obj).length;
    console.log("? object size: %s bytes", length);
    return obj;
}

async function run(n, testObj, name, keyChanges) {
    await runRedisBenchmarkSet(n, testObj, name, keyChanges);
    await runRedisJsonBenchmarkSet(n, testObj, name, keyChanges);
    await runRedisBenchmarkSetWithParse(n, testObj, name, keyChanges);
}

async function start(n = 1) {
    for (let i = 1; i <= n; i++) {
        console.log("========= change %s key(s) benchmark:", i)
        await run(5000, generateObject(3), "small-object: 3 keys", i);
        console.log("------------------------");
        await run(5000, generateObject(10), "medium-object: 10 keys", i);
        console.log("------------------------");
        await run(5000, generateObject(50), "large-object: 50 keys", i);
        console.log("------------------------");
        await run(5000, generateObject(500), "very-large-object: 500 keys", i);
        console.log("------------------------");
        await run(5000, generateObject(5000), "gigantic-object: 5000 keys", i);
    }
}

start(5);

// const testObj = {
//     a: 1,
//     b: 2,
//     c: "hello",
//     d: "good"
// };
// const objectKeys = Object.keys(testObj);
// const randomKey = objectKeys[Math.floor(Math.random() * objectKeys.length)];
// let str = JSON.stringify(testObj);
// console.log("str before replace: %s", str);
// str = str.replace(new RegExp(`"${randomKey}":.*?([,}])`), `"${randomKey}":"new_value"$1`);
// console.log("str after replace: %s", str);
