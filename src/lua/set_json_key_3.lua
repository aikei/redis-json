local obj = redis.call("get",KEYS[1]);
local n = table.getn(ARGV)
local s2 = obj
for i = 1,n,2 do
    local regex = "{[^{]-"
    local split_string = {}
    for str in string.gmatch(ARGV[i], "([^%.]+)") do
        table.insert(split_string, str)
    end
    local sn = table.getn(split_string)
    for j = 1,sn do
        regex = regex .. split_string[j]
        if sn ~= j then
            regex = regex .. "[^{]-{[^{]-"
        end
    end
    s2 = string.gsub(s2,"^(" .. regex .. "\":)([^,}]+)", "%1" .. ARGV[i+1]);
end
redis.call("set",KEYS[1],s2);
return s2