const axios = require("axios");

test("api: get easy leaderboards from api", async () => {
    let data = JSON.parse(await axios("http://localhost:8080/api/leaderboards/easy"));
    expect.not.any(expect(data).toBeFalsy(), expect(data).not.stringContaining("Not Found"));
});

test("api: get standard leaderboards from api", async () => {
    let data = JSON.parse(await axios("http://localhost:8080/api/leaderboards/standard"));
    expect.not.any(expect(data).toBeFalsy(), expect(data).not.stringContaining("Not Found"));
});