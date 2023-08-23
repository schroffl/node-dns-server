/**
 * Provides parsing of DNS messages
 */
export class DecodingContext {

    constructor(buffer) {
        this.buffer = buffer;
        this.index = 0;
    }

    static decode(buffer) {
        const ctx = new DecodingContext(buffer);
        return ctx.message();
    }

    advance(n) {
        this.index += n;
    }

    uint8(do_advance = true, idx) {
        const value = this.buffer[idx ?? this.index];
        if (do_advance) this.advance(1);
        return value;
    }

    uint16(do_advance = true, idx) {
        const value = this.buffer.readUInt16BE(idx ?? this.index);
        if (do_advance) this.advance(2);
        return value;
    }

    uint32(do_advance = true, idx) {
        const value = this.buffer.readUInt32BE(idx ?? this.index);
        if (do_advance) this.advance(4);
        return value;
    }

    message() {
        const id = this.uint16();

        const byte_3 = this.uint8();
        const byte_4 = this.uint8();

        const qd_count = this.uint16();
        const an_count = this.uint16();
        const ns_count = this.uint16();
        const ar_count = this.uint16();

        const questions = this.questionSection(qd_count);
        const an_records = this.resourceRecords(an_count);
        const ns_records = this.resourceRecords(ns_count);
        const ar_records = this.resourceRecords(ar_count);

        console.assert(questions.length === qd_count);
        console.assert(an_records.length === an_count);
        console.assert(ns_records.length === ns_count);
        console.assert(ar_records.length === ar_count);

        return {
            header: {
                id: id,

                // Third byte
                qr:     (byte_3 & 0b10000000) >> 7,
                opcode: (byte_3 & 0b01111000) >> 3,
                aa:     (byte_3 & 0b00000100) >> 2,
                tc:     (byte_3 & 0b00000010) >> 1,
                rd:     (byte_3 & 0b00000001),

                // Fourth byte
                ra:     (byte_4 & 0b10000000) >> 7,
                z:      (byte_4 & 0b01110000) >> 4,
                rcode:  (byte_4 & 0b00001111),

                qd_count,
                an_count,
                ns_count,
                ar_count,
            },

            questions: questions,
            an_records: an_records,
            ns_records: ns_records,
            ar_records: ar_records,
        };
    }

    resourceRecords(count) {
        const records = [];

        while (count-- > 0) {
            const record = this.record();
            records.push(record);
        }

        return records;
    }

    record() {
        const name = this.name();
        const data = {
            name: name,
            type: this.uint16(),
            clas: this.uint16(),
            ttl: this.uint32(),
            rdlength: this.uint16(),
            rdata: undefined,
        };

        data.rdata = this.buffer.slice(this.index, this.index + data.rdlength);
        this.advance(data.rdlength);

        return data;
    }

    name() {
        const out = [];
        let is_following = false;
        let advance_by = 0;
        let idx = this.index;

        while (true) {
            const head = this.uint8(false, idx);
            const is_pointer = (head >> 6) === 0b11;

            if (is_pointer) {
                const second = this.uint8(false, idx + 1);
                const location = (head & 0b111111 << 8) | second;

                if (!is_following) {
                    advance_by += 2;
                }

                is_following = true;
                idx = location;
            } else if (head === 0) {
                if (!is_following) {
                    advance_by += 1;
                }

                break;
            } else {
                const part = this.buffer.slice(idx + 1, idx + 1 + head).toString('ascii');
                idx += 1 + head;
                out.push(part);

                if (!is_following) {
                    advance_by += 1 + head;
                }
            }
        }

        this.advance(advance_by);

        return out;
    }

    questionSection(qd_count) {
        const questions = [];

        while (qd_count-- > 0) {
            questions.push({
                qname: this.name(),
                qtype: this.uint16(),
                qclass: this.uint16(),
            });
        }

        return questions;
    }

}
