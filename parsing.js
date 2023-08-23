import { Tokenizer, TokenId } from './tokenizer.js';

export const run = (parser, str) => {
    const tokenizer = new Tokenizer(str);
    const result = parser(tokenizer);

    if (!result.ok) {
        throw new Error(result.error);
    } else {
        return result.value;
    }
};

export const oneOf = (parsers) => {
    return (tokenizer) => {
        const idx = tokenizer.idx;
        const errors = new Array(parsers.length);
        let i = 0;

        for (const parser of parsers) {
            const result = parser(tokenizer);

            if (result.ok) {
                return result;
            } else {
                tokenizer.idx = idx;
                errors[i++] = result.error;
            }
        }

        return {
            ok: false,
            error: 'No oneOf decoder matched:\n  * ' + errors.join('\n  * ') + '\n',
        };
    };
};

export const succeed = (value) => {
    return () => {
        return { ok: true, value: value };
    };
};

export const fail = (error) => {
    return () => {
        return { ok: false, error: error };
    };
};

export const object = (parsers) => {
    return (tokenizer) => {
        const out = {};

        for (const key in parsers) {
            const result = parsers[key](tokenizer);

            if (result.ok) {
                out[key] = result.value;
            } else {
                return result;
            }
        }

        return { ok: true, value: out };
    };
};

export const repeatUntil = (parser, token_id) => {
    const skipComment = (tokenizer) => {
        let token;

        while (true) {
            token = tokenizer.peek();

            if (token.id === TokenId.comment) {
                tokenizer.next();
            } else {
                break;
            }
        }
    };

    return (tokenizer) => {
        const items = [];
        skipComment(tokenizer);
        let token = tokenizer.peek();

        while (token.id !== token_id) {
            const result = parser(tokenizer);

            if (result.ok) {
                items.push(result.value);
            } else {
                return result;
            }

            skipComment(tokenizer);
            token = tokenizer.peek();
        }

        return { ok: true, value: items };
    };
};

export const chain = (parsers) => {
    return (tokenizer) => {
        const out = [];

        for (const parser of parsers) {
            const result = parser(tokenizer);

            if (result.ok) {
                out.push(result.value);
            } else {
                return result;
            }
        }

        return { ok: true, value: out };
    };

};

export const map = (fn, parser) => {
    return (tokenizer) => {
        const result = parser(tokenizer);

        if (result.ok) {
            return {
                ok: true,
                value: fn(result.value),
            };
        } else {
            return result;
        }
    };
};

export const andThen = (fn, parser) => {
    return (tokenizer) => {
        const result = parser(tokenizer);

        if (result.ok) {
            const next = fn(result.value);
            return next(tokenizer);
        } else {
            return result;
        }
    };
};

export const peek = (tokenizer) => {
    const token = tokenizer.peek();
    return { ok: true, value: token };
};

export const expect = (token_id) => {
    return (tokenizer) => {
        let token;

        while (true) {
            token = tokenizer.next();

            if (token.id !== TokenId.comment) {
                break;
            }
        }

        if (token_id !== token.id) {
            const expected_tag = Object.entries(TokenId).find(e => e[1] === token_id);
            const got_tag = Object.entries(TokenId).find(e => e[1] === token.id);

            return {
                ok: false,
                error: `Expected ${expected_tag[0]}, but got ${got_tag[0]}`
            };
        } else {
            return {
                ok: true,
                value: token.value,
            };
        }
    };
};
