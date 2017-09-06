export const err = (code, message) => ({
    code: code,
    message: message,
    stack: (new Error(message)).stack
});

export default err;
