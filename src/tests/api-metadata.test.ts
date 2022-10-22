import axios from "axios"

test("api: get metadata from username from api should not return a falsy value", async () => {
  let data = (await axios.get("http://localhost:8080/api/metadata")).data;
  expect(data).toBeTruthy();
});
