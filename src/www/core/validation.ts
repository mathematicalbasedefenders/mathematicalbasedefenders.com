function validatePassword(password: string): boolean {
  return !(
    password.length < 8 ||
    password.length > 48 ||
    password == "" ||
    password == null ||
    password.includes(" ") ||
    !/^[0-9a-zA-Z!"#%&'()*+,-.:;<=>?@^_`{|}~]*$/.test(password)
  );
}

export { validatePassword };
