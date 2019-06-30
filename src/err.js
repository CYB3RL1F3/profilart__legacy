export const err = (code, message) =>
  new Error(
    JSON.stringify({
      code,
      message
    })
  );

export default err;
