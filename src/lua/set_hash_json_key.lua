local obj = redis.call("hget",KEYS[1],KEYS[2]);
local s2 = string.gsub(obj,"(" .. ARGV[1] .. "\":)([^,}]+)(.*)", "%1" .. ARGV[2] .. "%3");
redis.call("hset",KEYS[1],KEYS[2],s2);
return s2