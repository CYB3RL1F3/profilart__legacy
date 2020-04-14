export const err = (code: number, message: string): Error => {
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
