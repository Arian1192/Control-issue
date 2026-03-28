FROM coturn/coturn:latest

COPY coturn.conf /etc/coturn/turnserver.conf.template
COPY --chmod=755 scripts/start-coturn.sh /usr/local/bin/start-coturn.sh

CMD ["/usr/local/bin/start-coturn.sh"]
