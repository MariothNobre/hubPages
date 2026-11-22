"""Add only the isolated DEV custom-domain route; preserve all existing sites."""
import re

TLS = '''\t# BEGIN HUBPAGES DEV DOMAIN TLS
\ton_demand_tls {
\t\task http://hubpages-dev:8080/api/domains/tls
\t}
\t# END HUBPAGES DEV DOMAIN TLS'''
SITE = '''# BEGIN HUBPAGES DEV DOMAIN ROUTE
https:// {
  tls {
    on_demand
  }
  encode zstd gzip
  reverse_proxy hubpages-dev:8080
  header {
    X-Robots-Tag "noindex, nofollow, noarchive"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    -Server
  }
}
# END HUBPAGES DEV DOMAIN ROUTE'''

SHARED_TLS = TLS.replace('DEV DOMAIN', 'DOMAIN').replace('hubpages-dev:8080', 'hubpages-prod:8080')
SHARED_SITE = '''# BEGIN HUBPAGES DOMAIN ROUTE
https:// {
  tls {
    on_demand
  }
  encode zstd gzip
  route {
    request_header -X-HubPages-Upstream
    forward_auth hubpages-prod:8080 {
      uri /api/domains/route?domain={host}
      copy_headers X-HubPages-Upstream
    }
    reverse_proxy {http.request.header.X-HubPages-Upstream} {
      header_up -X-HubPages-Upstream
    }
  }
  header {
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    -Server
  }
}
# END HUBPAGES DOMAIN ROUTE'''


def configure(source, production=False):
    shared = '# BEGIN HUBPAGES DOMAIN'
    if shared in source:
        if source.count(SHARED_TLS) != 1 or source.count(SHARED_SITE) != 1:
            raise ValueError('Configuração compartilhada alterada; revisão necessária.')
        return source
    if production:
        before = configure(source)
        if before.count(TLS) != 1 or before.count(SITE) != 1:
            raise ValueError('Configuração DEV alterada; revisão necessária.')
        return before.replace(TLS, SHARED_TLS).replace(SITE, SHARED_SITE)
    tls_start = '# BEGIN HUBPAGES DEV DOMAIN TLS'
    route_start = '# BEGIN HUBPAGES DEV DOMAIN ROUTE'
    if (tls_start in source) != (route_start in source):
        raise ValueError('Marcadores de domínios DEV incompletos; alteração interrompida.')
    if tls_start in source:
        if source.count(tls_start) != 1 or source.count(route_start) != 1:
            raise ValueError('Marcadores duplicados.')
        return source  # Never rewrite another service's configuration on redeploy.
    if re.search(r'\bon_demand_tls\b|^\s*(?:https://|:443)\s*\{', source, re.M):
        raise ValueError('Já há política TLS ou rota geral; revisão necessária, sem sobrescrever.')
    # Find the end of an optional global block, respecting quotes and comments.
    meaningful = re.search(r'(?m)^\s*[^\s#]', source)
    first = meaningful.start() if meaningful else 0
    first = first + len(source[first:]) - len(source[first:].lstrip())
    if first < len(source) and source[first] == '{':
        depth, quote, comment, escaped, end = 0, None, False, False, None
        for index in range(first, len(source)):
            char = source[index]
            if comment:
                if char == '\n':
                    comment = False
                continue
            if escaped:
                escaped = False
                continue
            if quote:
                if char == '\\' and quote == '"':
                    escaped = True
                elif char == quote:
                    quote = None
                continue
            if char in ('"', '`'):
                quote = char
            elif char == '#':
                comment = True
            elif char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    end = index
                    break
        if end is None:
            raise ValueError('Bloco global não reconhecido.')
        source = source[:end] + TLS + '\n' + source[end:]
    else:
        source = '{\n' + TLS + '\n}\n\n' + source
    return source.rstrip() + '\n\n' + SITE + '\n'


if __name__ == '__main__':
    import sys
    from pathlib import Path
    Path(sys.argv[2]).write_text(configure(Path(sys.argv[1]).read_text(), production='--production' in sys.argv))
