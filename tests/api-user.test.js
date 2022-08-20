const axios = require("axios");

test("api: get user (mistertfy64) from username from api should not return a falsy value", async () => {
    let data = (await axios.get("http://localhost:8080/api/users/mistertfy64")).data;
    expect(data).toBeTruthy();
});

test("api: get user (mistertfy64) from username from api should return a valid user object", async () => {
    let data = (await axios.get("http://localhost:8080/api/users/mistertfy64")).data;
    expect(data).toHaveProperty("statistics");
})

test("api: get user (mistertfy64) from _id from api should not return a falsy value", async () => {
    let data = (await axios.get("http://localhost:8080/api/users/617124b59ed3721a98d49fa5")).data;
    expect(data).toBeTruthy();
})

test("api: get user (mistertfy64) from _id from api should return a valid user object", async () => {
    let data = (await axios.get("http://localhost:8080/api/users/617124b59ed3721a98d49fa5")).data;
    expect(data).toHaveProperty("statistics");
})