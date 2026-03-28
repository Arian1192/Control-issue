FROM coturn/coturn:latest

COPY coturn.conf /etc/coturn/turnserver.conf.template
COPY scripts/start-coturn.sh /usr/local/bin/start-coturn.sh

RUN chmod 755 /usr/local/bin/start-coturn.sh

CMD ["/usr/local/bin/start-coturn.sh"]
