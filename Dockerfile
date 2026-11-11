FROM alpine:3.24.3

RUN apk add --no-cache \
    bash \
    curl \
    iproute2 \
    iptables \
    jq \
    wireguard-go \
    wireguard-tools

COPY assets/ca.rsa.4096.crt /usr/local/share/pia/ca.rsa.4096.crt
COPY assets/configure-network.sh /usr/local/bin/configure-network
COPY assets/pia-supervisor.sh /usr/local/bin/pia-supervisor
COPY assets/pia-health.sh /usr/local/bin/pia-health

RUN chmod 0755 /usr/local/bin/configure-network \
    /usr/local/bin/pia-supervisor \
    /usr/local/bin/pia-health

ENTRYPOINT ["/usr/local/bin/pia-supervisor"]
