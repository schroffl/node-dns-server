export const DNS_TYPE = {
    A: 1,
    NS: 2,
    CNAME: 5,
    SOA: 6,
    PTR: 12,
    HINFO: 13,
    MX: 15,
    TXT: 16,
    RP: 17,
    AFSDB: 18,
    SIG: 24,
    KEY: 25,
    AAAA: 28,
    LOC: 29,
    SRV: 33,
    NAPTR: 35,
    KX: 36,
    CERT: 37,
    DNAME: 39,
    APL: 42,
    SVCB: 65,
};

export const DNS_CLASS = {
    IN: 1,
    CS: 2,
    CH: 3,
    HS: 4,
};

export function dnsTypeId(type) {
    return DNS_TYPE[type];
}

export function dnsTypeName(id) {
    for (const key in DNS_TYPE) {
        if (id === DNS_TYPE[key]) {
            return key;
        }
    }
}

export function dnsClassId(clas) {
    return DNS_CLASS[clas];
}

export function dnsClassName(id) {
    for (const key in DNS_CLASS) {
        if (id === DNS_CLASS[key]) {
            return key;
        }
    }
}
