export const err = (code, message) => {
  const stack = new Error().stack;
  return new Error(
    JSON.stringify({
      code,
      message,
      stack
    })
  );
};

export default err;
