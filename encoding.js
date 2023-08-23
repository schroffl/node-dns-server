/**
 * Provides encoding of DNS messages
 */
export class EncodingContext {

    constructor() {
        this.index = 0;
        this.domain_name_map = {};
    }

    static encode(message) {
        const ctx = new EncodingContext();
        return ctx.message(message);
    }

    message(msg) {
        const header = Buffer.alloc(12);

        header.writeUint16BE(msg.header.id, 0);

        header.writeUint8(
              (msg.header.qr     << 7)
            | (msg.header.opcode << 3)
            | (msg.header.aa     << 2)
            | (msg.header.tc     << 1)
            |  msg.header.rd,
            2
        );

        header.writeUint8(
              (msg.header.ra << 7)
            | (msg.header.z  << 4)
            |  msg.header.rcode,
            3,
        );

        header.writeUint16BE(msg.header.qd_count, 4);
        header.writeUint16BE(msg.header.an_count, 6);
        header.writeUint16BE(msg.header.ns_count, 8);
        header.writeUint16BE(msg.header.ar_count, 10);

        console.assert(msg.header.qd_count === msg.questions.length);
        console.assert(msg.header.an_count === msg.an_records.length);
        console.assert(msg.header.ns_count === msg.ns_records.length);
        console.assert(msg.header.ar_count === msg.ar_records.length);

        this.index = header.length;

        return Buffer.concat([
            header,
            ...msg.questions.map(q => this.question(q)),
            ...msg.an_records.map(r => this.record(r)),
            ...msg.ns_records.map(r => this.record(r)),
            ...msg.ar_records.map(r => this.record(r)),
        ]);
    }

    name(parts) {
        const key = parts.slice().reverse().join('.');
        const existing = this.domain_name_map[key];

        // If this exact name was already used, we emit a
        // pointer to its first location.
        if (existing) {
            const out = Buffer.alloc(2);
            out.writeUint16BE((0xc0 << 8) | existing);
            this.index += 2;
            return out;
        }

        const total = parts.reduce((sum, part) => sum + part.length + 1, 1);
        const out = Buffer.alloc(total);
        let idx = 0;

        for (const part of parts) {
            out.writeUint8(part.length, idx);
            out.write(part, idx + 1, 'ascii');
            idx += part.length + 1;
        }

        out[idx] = 0;

        this.domain_name_map[key] = this.index;
        this.index += out.length;

        return out;
    }

    question(question) {
        const name = this.name(question.qname);
        const other = Buffer.alloc(4);
        other.writeUint16BE(question.qtype);
        other.writeUint16BE(question.qclass, 2);
        this.index += other.length;
        return Buffer.concat([name, other]);
    }

    record(record) {
        const name = this.name(record.name);
        const other = Buffer.alloc(10 + record.rdlength);
        other.writeUint16BE(record.type, 0);
        other.writeUint16BE(record.clas, 2);
        other.writeUint32BE(record.ttl, 4);
        other.writeUint16BE(record.rdlength, 8);
        other.set(record.rdata, 10);
        this.index += other.length;
        return Buffer.concat([name, other]);
    }

}
