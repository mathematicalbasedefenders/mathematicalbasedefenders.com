const axios = require("axios");

test("api: get metadata from username from api", async () => {
    let data = JSON.parse(await axios("http://localhost:8080/api/metadata"));
    expect.not.any(expect(data).toBeFalsy(), expect(data).not.stringContaining("Not Found"));
});