local s2 = redis.call("hget",KEYS[1],KEYS[2]);
for i = 1,#ARGV,2 do
    s2 = string.gsub(s2,"(" .. ARGV[i] .. "\":)([^,}]+)", "%1" .. ARGV[i+1])
end
redis.call("hset",KEYS[1],KEYS[2],s2);
return s2