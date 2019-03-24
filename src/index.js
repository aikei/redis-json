const redis = require("redis");
const fs = require("fs");
const debug = require("debug")("redis-json:RedisJson");
const path = require("path");

class RedisJson {
    /**
     * Constructs a RedisJson object
     * @param {object} options options object
     * @param {object} [options.redis] redis connections object.
     * If this is not defined, default connection options will be used. THis object will be
     * passed to `redis.createClient` method.
     * Alternatively, you can provide a `RedisClient` instance of `redis`
     * library as `options.redisClient` argument.
     * @param {string} [options.redis.host] redis connection host
     * @param {number} [options.redis.port] redis connection port
     * @param {string} [options.redis.password] redis password, if any
     * @param {object} [options.redisClient] as instance of redis.RedisClient class. If this is provided,
     * it will be used as the redis client for this `RedisJson` instance.
     */
    constructor(options = {}) {
        debug("constructor, options: %j", options);
        this.settings = {
            ownClient: true
        }
        if (options.redisClient) {
            this.settings.ownClient = false;
            this.redisClient = options.redisClient;
        } else {
            this.redisClient = redis.createClient(options.redis);
        }
        this.scriptHashes = {};
    }

    /**
     * Quits internal `redis` client, if it was created, or does nothing,
     * if external client was provided on connection within the `options.redisClient`
     * parameter.
     */
    quit() {
        if (this.settings.ownClient) {
            this.redisClient.quit();
        }
    }

    /**
     * Loads a script into redis cache
     * @param {string} scriptName means nothing, but should be unique. script will be saved in the 
     * scriptHashes object by this name.
     * @param {string} pathToFile path to file where script resides. absolute or relative to cwd.
     * @returns {Promise<object,object>} A promise which rejects with an error if we could not read file or
     * could not load script into redis cache, or resolves with script sha hash, if it was loaded successfully.
     */
    loadScript(scriptName, pathToFile) {
        debug("loadScript %s from file %s", scriptName, pathToFile);
        return new Promise((resolve, reject) => {
            fs.readFile(pathToFile, { encoding: "utf8" }, (err, script) => {
                if (err) {
                    debug("file read error: %j", err);
                    return reject(err);
                }
                this.redisClient.script("load", script, (err, hash) => {
                    if (err) {
                        debug("Error loading script %s from file %s:", scriptName, pathToFile, err);
                        reject(err);
                    } else {
                        this.scriptHashes[scriptName] = hash;
                        resolve(hash);
                    }
                });
            });
        });
    }

    /**
     * Inits this `RedisJson` instance by loading lua scripts into redis cache.
     * @returns {Promise<void,object>} a Promise which resolves once scripts have been loaded. A rejection
     * with an error object is possible.
     */
    async init() {
        await this.loadLuaScripts();
    }

    /**
     * Sets a json key of a json object kept in a plain redis key (i.e. a key you can get with redis's `get` command).
     * @param {string} redisKey redis key where json object resides 
     * @param {string} jsonKey key of the json object to set 
     * @param {string} newValue new value of the key
     * @returns {Promsie<string,string>} a Promise which resolves with an error string or a JSON string representing new object
     * oncce script has completed
     */
    setKey(redisKey, jsonKey, newValue) {
        debug("setKey %s -> %s = %s", redisKey, jsonKey, newValue);
        return new Promise((resolve) => {
            let value = newValue;
            switch(typeof newValue) {
                case "string":
                    value = `"${newValue}"`;
                    break;
                case "object":
                    value = JSON.stringify(newValue);
                    break;
            }
            this.redisClient.evalsha(this.scriptHashes.setJsonKey, "1", redisKey, jsonKey, value, (err, resp) => {
                resolve(err || resp);
            });
        });
    }

    /**
     * Increments by 1 json key of a json object stored in redis under plain key (i.e. key which you can get with redis's `get` command)
     * @param {string} redisKey redis key where json object is stored
     * @param {string} jsonKey json key to increment by 1. value may be an actual json number or a number in a string
     * @param {Promise<string,string>}a Promise which resolves with an error string or a JSON string representing new object
     * once script has been executed.
     */
    incrKey(redisKey, jsonKey) {
        debug("incrKey %s -> %s", redisKey, jsonKey);
        return new Promise((resolve) => {
            this.redisClient.evalsha(this.scriptHashes.incrJsonKey, "1", redisKey, jsonKey, (err, resp) => {
                resolve(err || resp);
            });
        });
    }

    /**
     * Sets a json key of a json object kept in a hash redis key (i.e. a key you can get with redis's `hget` command).
     * @param {string} redisKey redis key where hash object resides 
     * @param {string} hashKey hash key within the hash residing under `redisKey`, where json object resides
     * @param {string} jsonKey key of the json object to set 
     * @param {string} newValue new value of the key
     * @returns {Promsie<string,string>} a Promise which resolves with an error string or a JSON string representing new object
     * oncce script has completed
     */
    setHashKey(redisKey, hashKey, jsonKey, newValue) {
        debug("setHashKey: %s.%s, jsonKey: %s = %s", redisKey, hashKey, jsonKey, newValue);
        return new Promise((resolve) => {
            let value = newValue;
            switch(typeof newValue) {
                case "string":
                    value = `"${newValue}"`;
                    break;
                case "object":
                    value = JSON.stringify(newValue);
                    break;
            }
            this.redisClient.evalsha(this.scriptHashes.setHashKey, "2", redisKey, hashKey, jsonKey, value, (err, resp) => {
                resolve(err || resp);
            });
        });
    }

    /**
     * Increments by 1 a json key of a json object kept in a hash redis key (i.e. a key you can get with redis's `hget` command).
     * @param {string} redisKey redis key where hash object resides 
     * @param {string} hashKey hash key within the hash residing under `redisKey`, where json object resides
     * @param {string} jsonKey key of the json object to set. its value should either be a number or a string convertible to number
     * @returns {Promsie<string,string>} a Promise which resolves with an error string or a JSON string representing new object
     * oncce script has completed
     */
    incrHashKey(redisKey, hashKey, jsonKey) {
        debug("incrHashKey: %s -> %s, jsonKey: %s", redisKey, hashKey, jsonKey);
        return new Promise((resolve) => {
            this.redisClient.evalsha(this.scriptHashes.incrHashKey, "2", redisKey, hashKey, jsonKey, (err, resp) => {
                resolve(err || resp);
            });
        });
    }

    async loadLuaScripts() {
        await Promise.all([
            this.loadScript("setHashKey", path.resolve(__dirname, "lua/set_hash_json_key.lua")),
            this.loadScript("incrHashKey", path.resolve(__dirname, "lua/increment_hash_json_key.lua")),
            this.loadScript("setJsonKey", path.resolve(__dirname, "lua/set_json_key.lua")),
            this.loadScript("incrJsonKey", path.resolve(__dirname, "lua/increment_json_key.lua"))
        ]);
    }
}

module.exports = RedisJson;
