const axios = require("axios");

test("api: get user (mistertfy64) from username from api", async () => {
    let data = JSON.parse(await axios("http://localhost:8080/api/users/mistertfy64"));
    expect.not.any(expect(data).toBeFalsy(), expect(data).not.stringContaining("Not Found"));
});

test("api: get user (mistertfy64) from _id from api", async () => {
    let data = JSON.parse(await axios("http://localhost:8080/api/users/617124b59ed3721a98d49fa5"));
    expect.not.any(expect(data).toBeFalsy(), expect(data).not.stringContaining("Not Found"));
})