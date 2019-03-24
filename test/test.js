const redis = require("redis");
const RedisJson = require("../src");
const bluebird = require("bluebird");
bluebird.promisifyAll(redis.RedisClient.prototype);
const expect = require("expect.js");
const debug = require("debug")("redis-json:RedisJson:Test");

describe("redis json tests", () => {

    let redisJson;
    /**
     * @type {redis.RedisClient}
     */
    let redisClient;

    beforeEach(async () => {
        redisClient = redis.createClient();
        await redisClient.flushallAsync();
        redisJson = new RedisJson();
        await redisJson.init();
    });

    afterEach(() => {
        redisClient.quit();
        redisJson.quit();
    });

    it("should change value of a json object key stored in a plain redis key", async () => {
        await redisClient.setAsync("test-obj", JSON.stringify({ a: 2, b: "hello", c: "test" }));
        await redisJson.setKey("test-obj", "b", "bye");
        const newObjString = await redisClient.getAsync("test-obj");
        const newObj = JSON.parse(newObjString);
        expect(newObj.a).to.equal(2);
        expect(newObj.b).to.equal("bye");
        expect(newObj.c).to.equal("test");
    });

    it("should change value of the last json object key stored in a plain redis key", async () => {
        await redisClient.setAsync("test-obj", JSON.stringify({ a: 2, b: "hello", c: "test" }));
        await redisJson.setKey("test-obj", "c", "nest");
        const newObjString = await redisClient.getAsync("test-obj");
        const newObj = JSON.parse(newObjString);
        expect(newObj.a).to.equal(2);
        expect(newObj.b).to.equal("hello");
        expect(newObj.c).to.equal("nest");
    });

    it("should increment number in a json object stored in a plain redis key", async () => {
        await redisClient.setAsync("test-obj", JSON.stringify({ a: 2, b: "hello", c: "test" }));
        await redisJson.incrKey("test-obj", "a");
        const newObjString = await redisClient.getAsync("test-obj");
        const newObj = JSON.parse(newObjString);
        expect(newObj.a).to.equal(3);
        expect(newObj.b).to.equal("hello");
        expect(newObj.c).to.equal("test");
    });

    it("should increment last number in a json object stored in a plain redis key", async () => {
        await redisClient.setAsync("test-obj", JSON.stringify({ a: 2, b: "hello", c: "test", d: 6 }));
        await redisJson.incrKey("test-obj", "d");
        const newObjString = await redisClient.getAsync("test-obj");
        const newObj = JSON.parse(newObjString);
        expect(newObj.a).to.equal(2);
        expect(newObj.b).to.equal("hello");
        expect(newObj.c).to.equal("test");
        expect(newObj.d).to.equal(7);
    });

    it("should increment number stored as a json string in a plain redis key", async () => {
        await redisClient.setAsync("test-obj", JSON.stringify({ a: "2", b: "hello", c: "test" }));
        await redisJson.incrKey("test-obj", "a");
        const newObjString = await redisClient.getAsync("test-obj");
        const newObj = JSON.parse(newObjString);
        expect(newObj.a).to.equal("3");
        expect(newObj.b).to.equal("hello");
        expect(newObj.c).to.equal("test");
    });

    it("should increment last number in a json object stored in a plain redis key", async () => {
        await redisClient.setAsync("test-obj", JSON.stringify({ a: 2, b: "hello", c: "test", d: "6" }));
        await redisJson.incrKey("test-obj", "d");
        const newObjString = await redisClient.getAsync("test-obj");
        const newObj = JSON.parse(newObjString);
        expect(newObj.a).to.equal(2);
        expect(newObj.b).to.equal("hello");
        expect(newObj.c).to.equal("test");
        expect(newObj.d).to.equal("7");
    });

    it("should change value of a json object key stored in a hash redis key", async () => {
        await redisClient.hsetAsync("test-obj-hash", "hash-1", JSON.stringify({ a: 2, b: "hello", c: "test" }));
        await redisJson.setHashKey("test-obj-hash", "hash-1", "b", "bye");
        const newObjString = await redisClient.hgetAsync("test-obj-hash", "hash-1");
        const newObj = JSON.parse(newObjString);
        expect(newObj.a).to.equal(2);
        expect(newObj.b).to.equal("bye");
        expect(newObj.c).to.equal("test");
    });

    it("should change value of the last json object key stored in a hash redis key", async () => {
        await redisClient.hsetAsync("test-obj-hash", "hash-1", JSON.stringify({ a: 2, b: "hello", c: "test" }));
        await redisJson.setHashKey("test-obj-hash", "hash-1", "c", "nest");
        const newObjString = await redisClient.hgetAsync("test-obj-hash", "hash-1");
        const newObj = JSON.parse(newObjString);
        expect(newObj.a).to.equal(2);
        expect(newObj.b).to.equal("hello");
        expect(newObj.c).to.equal("nest");
    });

    it("should increment number in a json object stored in a hash redis key", async () => {
        await redisClient.hsetAsync("test-obj", "hash-1", JSON.stringify({ a: 2, b: "hello", c: "test" }));
        await redisJson.incrHashKey("test-obj", "hash-1", "a");
        const newObjString = await redisClient.hgetAsync("test-obj", "hash-1");
        const newObj = JSON.parse(newObjString);
        expect(newObj.a).to.equal(3);
        expect(newObj.b).to.equal("hello");
        expect(newObj.c).to.equal("test");
    });

    it("should increment last number in a json object stored in a hash redis key", async () => {
        await redisClient.hsetAsync("test-obj", "hash-1", JSON.stringify({ a: 2, b: "hello", c: "test", d: 6 }));
        await redisJson.incrHashKey("test-obj", "hash-1", "d");
        const newObjString = await redisClient.hgetAsync("test-obj", "hash-1");
        const newObj = JSON.parse(newObjString);
        expect(newObj.a).to.equal(2);
        expect(newObj.b).to.equal("hello");
        expect(newObj.c).to.equal("test");
        expect(newObj.d).to.equal(7);
    });

    it("should increment number stored as a json string in a hash redis key", async () => {
        await redisClient.hsetAsync("test-obj", "hash-1", JSON.stringify({ a: "2", b: "hello", c: "test" }));
        await redisJson.incrHashKey("test-obj", "hash-1", "a");
        const newObjString = await redisClient.hgetAsync("test-obj", "hash-1");
        const newObj = JSON.parse(newObjString);
        expect(newObj.a).to.equal("3");
        expect(newObj.b).to.equal("hello");
        expect(newObj.c).to.equal("test");
    });

    it("should increment last number in a json object stored in a hash redis key", async () => {
        await redisClient.hsetAsync("test-obj", "hash-1", JSON.stringify({ a: 2, b: "hello", c: "test", d: "6" }));
        await redisJson.incrHashKey("test-obj", "hash-1", "d");
        const newObjString = await redisClient.hgetAsync("test-obj", "hash-1");
        const newObj = JSON.parse(newObjString);
        expect(newObj.a).to.equal(2);
        expect(newObj.b).to.equal("hello");
        expect(newObj.c).to.equal("test");
        expect(newObj.d).to.equal("7");
    });

    it("should correctly set value of a json object key to json object value", async () => {
        const orig = { a: 2, b: "hello", c: "test" };
        debug("original object: %j", orig);
        await redisClient.setAsync("test-obj", JSON.stringify(orig));
        const obj = {name: "newObject", type: "obj" };
        debug("object to set: %j", obj);
        await redisJson.setKey("test-obj", "b", obj);
        const newObjString = await redisClient.getAsync("test-obj");
        debug("new object: %s", newObjString);
        const newObj = JSON.parse(newObjString);
        expect(newObj.a).to.equal(2);
        expect(JSON.stringify(newObj.b)).to.equal(JSON.stringify(obj));
        expect(newObj.c).to.equal("test");
    });

    it("should correctly set value of a json object key to json object value; - redis hash", async () => {
        const orig = { a: 2, b: "hello", c: "test" };
        debug("original object: %j", orig);
        await redisClient.hsetAsync("test-obj", "test-hash", JSON.stringify(orig));
        const obj = {name: "newObject", type: "obj" };
        debug("object to set: %j", obj);
        await redisJson.setHashKey("test-obj", "test-hash", "b", obj);
        const newObjString = await redisClient.hgetAsync("test-obj", "test-hash");
        debug("new object: %s", newObjString);
        const newObj = JSON.parse(newObjString);
        expect(newObj.a).to.equal(2);
        expect(JSON.stringify(newObj.b)).to.equal(JSON.stringify(obj));
        expect(newObj.c).to.equal("test");
    });
});