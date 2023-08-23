import dgram from 'node:dgram';
import fs from 'node:fs';

import { DecodingContext } from './decoding.js';
import { EncodingContext } from './encoding.js';
import { Rules } from './rules.js';

const spec = fs.readFileSync('./spec.example').toString('utf8');
const rules = Rules.parse(spec);

const sock = dgram.createSocket('udp4');
const forward_client = dgram.createSocket('udp4');
const forward_to = '1.1.1.1';

// Pending requests which were forwarded and are waiting
// for a response.
const pending = {};

const log = (tag, ...args) => console.log(`[${tag}]`, ...args);

forward_client.on('message', msg => {
    const res = DecodingContext.decode(msg);
    const id = res.header.id;

    if (id in pending) {
        const rinfo = pending[id];
        sock.send(msg, rinfo.port, rinfo.address, () => log('FORWARD', 'Responded to', id));
        delete pending[id];
    }
});

sock.on('message', (msg, rinfo) => {
    const req = DecodingContext.decode(msg);
    const question = req.questions[0];
    const found = rules.find(question);

    const name = question.qname.join('.');
    const debug_info = `${name} (TYPE ${question.qtype}, CLASS ${question.qclass})`;

    if (found) {
        const answers = [];

        if (found.res.found) {
            answers.push({
                name: question.qname,
                type: found.res.rtype,
                clas: found.res.rclass,
                ttl: 1,
                rdlength: found.res.rdata.length,
                rdata: found.res.rdata,
            });
        }

        const res = EncodingContext.encode({
            header: {
                id: req.header.id,

                qr: 1,
                opcode: 0,
                aa: 0,
                tc: 0,
                rd: 0,
                ra: 0,
                z: 0,
                rcode: found.res.found === false ? found.res.status : 0,

                qd_count: 1,
                an_count: answers.length,
                ns_count: 0,
                ar_count: 0,
            },
            questions: [question],
            an_records: answers,
            ns_records: [],
            ar_records: [],
        });

        log('MATCHED', 'Responded to', req.header.id, 'requesting', debug_info);
        sock.send(res, rinfo.port, rinfo.address);
    } else {
        log('FORWARD', 'Forwarded', req.header.id, 'requesting', debug_info);
        pending[req.header.id] = rinfo;
        forward_client.send(msg, 53, forward_to);
    }
});

sock.bind(53, '0.0.0.0');
