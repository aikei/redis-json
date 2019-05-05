local s2 = redis.call("get",KEYS[1]);
for i = 1,#ARGV,2 do
    s2 = string.gsub(s2,"(" .. ARGV[i] .. "\":)([^,}]+)", "%1" .. ARGV[i+1])
end
redis.call("set",KEYS[1],s2);
return s2