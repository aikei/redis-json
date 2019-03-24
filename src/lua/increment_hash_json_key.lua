local obj = redis.call("hget",KEYS[1],KEYS[2]);
local n = string.match(obj, ARGV[1] .. "\":\"*([0-9]+)\"*");
n = n + 1;
local s2 = string.gsub(obj,"(" .. ARGV[1] .. "\":\"*)([0-9]*)(\"*)", "%1" .. n .. "%3");
redis.call("hset",KEYS[1],KEYS[2],s2);
return s2;