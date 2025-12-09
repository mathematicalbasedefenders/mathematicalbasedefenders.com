function getMockUserEmail(number: number) {
  const id = number.toString().padStart(3, "0");
  return `user${id}@example.com`;
}

function getMockPendingUserEmail(number: number) {
  const id = number.toString().padStart(3, "0");
  return `pendinguser${id}@example.com`;
}

function getMockUserUsername(number: number) {
  const id = number.toString().padStart(3, "0");
  return `User${id}`;
}

function getMockPendingUserUsername(number: number) {
  const id = number.toString().padStart(3, "0");
  return `PendingUser${id}`;
}

function getMockConfirmationCode(number: number) {
  const MOD = 1000000007;
  const result = Math.floor(Math.pow(number, 4)) % MOD;
  return result.toString();
}

export {
  getMockUserEmail,
  getMockUserUsername,
  getMockPendingUserEmail,
  getMockPendingUserUsername,
  getMockConfirmationCode
};
