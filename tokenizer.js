const States = {
    begin: 0,
    read_text: 1,
    read_comment: 2,
};

export const TokenId = {
    eof: 0,
    invalid: 1,
    arrow: 2,
    text: 3,
    comment: 4,
    dash: 5,
};

export class Tokenizer {

    constructor(str) {
        this.str = str;
        this.idx = 0;
    }

    peek() {
        const idx = this.idx;
        const token = this.next();
        this.idx = idx;
        return token;
    }

    next() {
        let state = States.begin;
        let token = {
            id: TokenId.eof,
            start: this.idx,
            end: this.idx,
        };

        let stop = false;

        outer: while (!stop && this.idx < this.str.length) {
            const char = this.str.charAt(this.idx);

            inner: switch (state) {

                case States.begin: switch (char) {
                    case ' ':
                    case '\n':
                    case '\t':
                    case '\r':
                        token.start += 1;
                        this.idx += 1;
                        break inner;

                    case '>':
                        token.id = TokenId.arrow;
                        this.idx += 1;
                        stop = true;
                        break inner;

                    case '-':
                        token.id = TokenId.dash;
                        this.idx += 1;
                        stop = true;
                        break inner;

                    case '#':
                        state = States.read_comment;
                        token.id = TokenId.comment;
                        this.idx += 1;
                        stop = false;
                        break inner;

                    default: {
                        this.idx += 1;

                        if (isTextChar(char)) {
                            state = States.read_text;
                            token.id = TokenId.text;
                            break inner;
                        } else {
                            token.id = TokenId.invalid;
                            stop = true;
                            break outer;
                        }
                    }
                }

                case States.read_text: {
                    if (isTextChar(char)) {
                        this.idx += 1;
                        break inner;
                    } else {
                        stop = true;
                        break outer;
                    }
                }

                case States.read_comment: {
                    if (char === '\n' || char === '\r') {
                        stop = true;
                        break outer;
                    } else {
                        this.idx += 1;
                        break inner;
                    }
                }

                default: {
                    throw new Error(`Unhandled state ${state}`);
                }
            }
        }

        token.end = this.idx;
        token.value = this.str.slice(token.start, token.end);

        return token;
    }

}

function isTextChar(char) {
    const c = char.charCodeAt(0);

    return isInRange(c, 0x30, 0x39)
        || isInRange(c, 65, 90)
        || isInRange(c, 97, 122)
        || char === '.'
        || char === ':';
}

function isInRange(v, lower, upper) {
    return v >= lower && v <= upper;
}
