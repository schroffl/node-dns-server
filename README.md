A very basic DNS server built for educational purposes.

Execute `node index.js` or `npm start` to launch the server.
This will load the `spec.example` file, which tells the server how to respond to certain queries.
If it cannot find a matching rule for a client request, that request is forwarded to `1.1.1.1` right now.

The rule

```
  A google.com IN
> A 127.0.0.1 IN
```

leads to this output from [dig](https://en.wikipedia.org/wiki/Dig_(command))

```
> dig a google.com @127.0.0.1

; <<>> DiG 9.10.6 <<>> a google.com @127.0.0.1
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 49940
;; flags: qr; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 0

;; QUESTION SECTION:
;google.com.			IN	A

;; ANSWER SECTION:
google.com.		1	IN	A	127.0.0.1

;; Query time: 1 msec
;; SERVER: 127.0.0.1#53(127.0.0.1)
;; WHEN: Wed Aug 23 22:11:19 CEST 2023
;; MSG SIZE  rcvd: 44
```

#### References
* [RFC1035 - DOMAIN NAMES - IMPLEMENTATION AND SPECIFICATION](https://datatracker.ietf.org/doc/html/rfc1035)
