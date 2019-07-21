local obj = redis.call("get",KEYS[1]);
local s2 = string.gsub(obj,"(" .. ARGV[1] .. "\":)([^,}]+)", "%1" .. ARGV[2]);
redis.call("set",KEYS[1],s2);
return s2;