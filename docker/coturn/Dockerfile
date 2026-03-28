FROM coturn/coturn:latest

USER root
RUN apt-get update -qq && apt-get install -y --no-install-recommends iproute2 && rm -rf /var/lib/apt/lists/*

COPY coturn.conf /etc/coturn/turnserver.conf.template
COPY --chmod=755 scripts/start-coturn.sh /usr/local/bin/start-coturn.sh

CMD ["/usr/local/bin/start-coturn.sh"]
