const axios = require("axios");

test("api: getting easy leaderboards from api should not return not found", async () => {
    let data = (await axios.get("http://localhost:8080/api/leaderboards/easy")).data;
    expect(data).toEqual(expect.not.stringContaining("Not Found"));
});
test("api: getting easy leaderboards from api should not return a falsy value", async () => {
    let data = (await axios.get("http://localhost:8080/api/leaderboards/standard")).data;
    expect(data).toBeTruthy();
});

test("api: getting standard leaderboards from api should not return not found", async () => {
    let data = (await axios.get("http://localhost:8080/api/leaderboards/standard")).data;
    expect(data).toEqual(expect.not.stringContaining("Not Found"));
});

test("api: getting standard leaderboards from api should not return a falsy value", async () => {
    let data = (await axios.get("http://localhost:8080/api/leaderboards/standard")).data;
    expect(data).toBeTruthy();
});
