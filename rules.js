import { TokenId } from './tokenizer.js';
import { dnsClassId, dnsTypeId } from './common.js';
import { run, succeed, fail, andThen, map, object, repeatUntil, chain, peek, expect  } from './parsing.js';

const Decoders = {

    ipv4: andThen(
        raw => {
            const parts = raw.split('.');

            if (parts.length !== 4) {
                return fail('Invalid IPv4 address');
            }

            const nums = parts.map(s => parseInt(s, 10));

            return succeed(Buffer.from(nums));
        },
        expect(TokenId.text),
    ),

    ipv6: andThen(
        () => {
            return fail('IPv6 parsing is TODO');
        },
        expect(TokenId.text),
    ),

    ascii_buffer: map(
        str => Buffer.from(str, 'ascii'),
        expect(TokenId.text),
    ),

    dnstype: andThen(
        type => {
            const id = dnsTypeId(type);
            return typeof id === 'number'
                ? succeed({ name: type, id: id })
                : fail(`Unhandled type ${type}`);
        },
        expect(TokenId.text),
    ),

    dnsclass: andThen(
        cls => {
            const id = dnsClassId(cls);
            return typeof id === 'number'
                ? succeed({ name: cls, id: id })
                : fail(`Unhandled class ${cls}`);
        },
        expect(TokenId.text),
    ),

};

export class Rules {

    static parse(raw) {
        const res_decoder = andThen(
            type => {
                const mapping = {
                    A: Decoders.ipv4,
                    AAAA: Decoders.ipv6,
                    CNAME: Decoders.ascii_buffer,
                    TXT: Decoders.ascii_buffer,
                };

                if (!(type.name in mapping)) {
                    return fail(`Unhandled type ${type.name}`);
                }

                return object({
                    type: succeed(type.id),
                    rdata: mapping[type.name],
                });
            },
            Decoders.dnstype,
        );

        const error_response_decoder = map(
            list => list[1],
            chain([
                expect(TokenId.dash),
                succeed({
                    found: false,
                    status: 4
                }),
            ]),
        );

        const success_response_decoder = map(
            data => {
                return {
                    found: true,
                    rtype: data[0].type,
                    rdata: data[0].rdata,
                    rclass: data[1].id,
                };
            },
            chain([ res_decoder, Decoders.dnsclass ]),
        );

        const response_decoder = andThen(
            token => {
                if (token.id === TokenId.dash) {
                    return error_response_decoder;
                } else {
                    return success_response_decoder;
                }
            },
            peek,
        );

        const rule_decoder = map(
            list => {
                return {
                    qtype: list[0].id,
                    qname: list[1],
                    qclass: list[2].id,
                    res: list[4],
                };
            }, chain([
                Decoders.dnstype,
                expect(TokenId.text),
                Decoders.dnsclass,
                expect(TokenId.arrow),
                response_decoder,
            ]),
        );

        const decoder = repeatUntil(rule_decoder, TokenId.eof);
        const result = run(decoder, raw);

        return new Rules(result);
    }

    constructor(rules) {
        this.rules = rules;
    }

    find(question) {
        const qname = question.qname.join('.');
        const rule = this.rules.find(r => {
            return r.qname === qname
                && r.qclass === question.qclass
                && r.qtype === question.qtype;
        });

        return rule;
    }

}
