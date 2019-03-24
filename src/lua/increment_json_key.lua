local obj = redis.call("get",KEYS[1]);
local n = string.match(obj, ARGV[1] .. "\":\"*([0-9]+)\"*");
n = n + 1;
local s2 = string.gsub(obj,"(" .. ARGV[1] .. "\":\"*)([0-9]*)(\"*)", "%1" .. n .. "%3");
redis.call("set",KEYS[1],s2);
return s2;