local s2 = redis.call("get",KEYS[1]);
for i=1,#ARGV,2 do
    local n = string.match(s2, ARGV[i] .. "\":\"*([0-9]+)\"*");
    n = n + ARGV[i+1];
    s2 = string.gsub(s2,"(" .. ARGV[i] .. "\":\"*)([0-9]*)(\"*)", "%1" .. n .. "%3");
end
redis.call("set",KEYS[1],s2);
return s2;