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
        /**
         * @type {redis.RedisClient}
         */
        this.redisClient;
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
     * @param {...any} args list of any number of arguments in the following order:
     *  - `arg_1`: json key name to set
     *  - `arg_2`: value to set
     * 
     * `arg_2` may be followed by another `arg_1` or may be the last argument in
     * the sequence. `arg_1` should always be followed by `arg_2`.
     * @returns {Promsie<string,string>} a Promise which resolves with an error string or a JSON string representing new object
     * oncce script has completed
     */
    setKey(redisKey, ...args) {
        debug("setKey %s -> %j", redisKey, args);
        return new Promise((resolve) => {
            for (let i = 1; i < args.length; i += 2) {
                let value = args[i];
                switch (typeof value) {
                    case "string":
                        value = `"${value}"`;
                        break;
                    case "object":
                        value = JSON.stringify(value);
                        break;
                }
                args[i] = value;
            }
            this.redisClient.evalsha(this.scriptHashes.setJsonKeys, "1", redisKey, ...args, (err, resp) => {
                resolve(err || resp);
            });
        });
    }

    /**
     * Increments by 1 json key of a json object stored in redis under plain key (i.e. key which you can get with redis's `get` command)
     * @param {string} redisKey redis key where json object is stored
     * @param {...any} args list of any number of arguments in the following order:
     *  - `arg_1`: json key name to incrmenet
     *  - `arg_2`: increment value
     * 
     * `arg_2` may be followed by another `arg_1` or may be the last argument in
     * the sequence. `arg_1` should always be followed by `arg_2`, unless there is just 1 argument, in which case `arg_2` is
     * assumed to be equal to 1 by default. 
     * @returns {Promise<string,string>} a Promise which resolves with an error string or a JSON string representing new object
     * once script has been executed.
     */
    incrKey(redisKey, ...args) {
        debug("incrKey %s -> args: %j", redisKey, args);
        if (args.length === 1) {
            args.push(1);
        }
        return new Promise((resolve) => {
            this.redisClient.evalsha(this.scriptHashes.incrJsonKeys, "1", redisKey, ...args, (err, resp) => {
                resolve(err || resp);
            });
        });
    }

    /**
     * Sets a json key of a json object kept in a hash redis key (i.e. a key you can get with redis's `hget` command).
     * @param {string} redisKey redis key where hash object resides 
     * @param {string} hashKey hash key within the hash residing under `redisKey`, where json object resides
     * @param {...any} args list of any number of arguments in the following order:
     *  - `arg_1`: json key name to set
     *  - `arg_2`: value to set
     * 
     * `arg_2` may be followed by another `arg_1` or may be the last argument in
     * the sequence. `arg_1` should always be followed by `arg_2`.
     * @returns {Promsie<string,string>} a Promise which resolves with an error string or a JSON string representing new object
     * oncce script has completed
     */
    setHashKey(redisKey, hashKey, ...args) {
        debug("setHashKey: %s.%s, args: %j", redisKey, hashKey, args);
        return new Promise((resolve) => {
            for (let i = 1; i < args.length; i += 2) {
                let value = args[i];
                switch(typeof value) {
                    case "string":
                        value = `"${value}"`;
                        break;
                    case "object":
                        value = JSON.stringify(value);
                        break;
                }
                args[i] = value;
            }
            this.redisClient.evalsha(this.scriptHashes.setHashKeys, "2", redisKey, hashKey, ...args, (err, resp) => {
                resolve(err || resp);
            });
        });
    }

    /**
     * Increments by 1 a json key of a json object kept in a hash redis key (i.e. a key you can get with redis's `hget` command).
     * @param {string} redisKey redis key where hash object resides 
     * @param {string} hashKey hash key within the hash residing under `redisKey`, where json object resides
     * @param {...any} args list of any number of arguments in the following order:
     *  - `arg_1`: json key name to increment,
     *  - `arg_2`: value by which we want to increment the key.
     * 
     * `arg_2` may be followed by another `arg_1` or may be the last argument in
     * the sequence. `arg_1` should always be followed by `arg_2`, unless there is just 1 argument, in which case `arg_2` is
     * assumed to be equal to 1 by default. 
     * @returns {Promsie<string,string>} a Promise which resolves with an error string or a JSON string representing new object
     * oncce script has completed
     */
    incrHashKey(redisKey, hashKey, ...args) {
        debug("incrHashKey: %s -> %s, args: %j", redisKey, hashKey, args);
        if (args.length === 1) {
            args.push(1);
        }
        return new Promise((resolve) => {
            this.redisClient.evalsha(this.scriptHashes.incrHashKeys, "2", redisKey, hashKey, ...args, (err, resp) => {
                resolve(err || resp);
            });
        });
    }

    async loadLuaScripts() {
        await Promise.all([
            this.loadScript("setHashKey", path.resolve(__dirname, "lua/set_hash_json_key.lua")),
            this.loadScript("incrHashKey", path.resolve(__dirname, "lua/increment_hash_json_key.lua")),
            this.loadScript("incrHashKeys", path.resolve(__dirname, "lua/increment_hash_json_keys.lua")),
            this.loadScript("setJsonKey", path.resolve(__dirname, "lua/set_json_key.lua")),
            this.loadScript("incrJsonKey", path.resolve(__dirname, "lua/increment_json_key.lua")),
            this.loadScript("incrJsonKeys", path.resolve(__dirname, "lua/increment_json_keys.lua")),
            this.loadScript("setJsonKeys", path.resolve(__dirname, "lua/set_json_keys.lua")),
            this.loadScript("setHashKeys", path.resolve(__dirname, "lua/set_hash_json_keys.lua")),
        ]);
    }
}

module.exports = RedisJson;
