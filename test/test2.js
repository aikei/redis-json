const redis = require("redis");
const RedisJson = require("../src");
const bluebird = require("bluebird");
bluebird.promisifyAll(redis.RedisClient.prototype);
const expect = require("expect.js");
const debug = require("debug")("redis-json:RedisJson:Test");
const path = require("path");

describe("Tests without automatically creating RedisJson instance", () => {

    let redisJson;
    let redisClient;

    beforeEach(async () => {
        redisClient = redis.createClient();
        await redisClient.flushallAsync();
    });

    afterEach(() => {
        redisJson.quit();
        redisClient.quit();
    });

    it("should work correctly with a provided existing redis client instance", async () => {
        redisJson = new RedisJson({
            redisClient: redisClient
        });
        await redisJson.init();
        await redisClient.setAsync("test-obj", JSON.stringify({ a: 2, b: "hello", c: "test" }));
        const setKeyResp = await redisJson.setKey("test-obj", "b", "bye");
        debug("setKeyResp: ", setKeyResp);
        const newObjString = await redisClient.getAsync("test-obj");
        const newObj = JSON.parse(newObjString);
        expect(newObj.a).to.equal(2);
        expect(newObj.b).to.equal("bye");
        expect(newObj.c).to.equal("test");
    });

    it("loadScript promise should reject if wrong filename is provided", (done) => {
        redisJson = new RedisJson({
            redisClient: redisClient
        });
        redisJson.loadScript("newScript", "newScript.lua").then(() => {
            debug("Promise resolved - this is wrong!");
        }, (err) => {
            debug("Promise rejected with:", err);
            done();
        });
    });

    it("should reject loadScript promise if script is faulty", (done) => {
        redisJson = new RedisJson({
            redisClient: redisClient
        });
        const pathToFaulty = path.resolve(__dirname, "../src/lua/__faulty.lua");
        debug("path to faulty file: %s", pathToFaulty);
        redisJson.loadScript("__faulty", pathToFaulty).then(() => {
            debug("Promise resolved - this is wrong!");
        }, (err) => {
            expect(err.code).not.to.equal("ENOENT");
            debug("Error message: %s", err.message);
            debug("Promise rejected with:", err);
            done();
        });
    });

});
