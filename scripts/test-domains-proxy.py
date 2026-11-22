import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('proxy', Path('deploy/custom-domains-proxy.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
sites = 'app.sistera.com.br {\n reverse_proxy sistera:8080\n}\n' + Path('deploy/Caddyfile.hubpages.caddy').read_text()
for before in [sites, '# comment\n{\n email "a@example.test"\n servers {\n  max_header_size 20KB\n }\n}\n' + sites]:
    after = module.configure(before)
    assert sites in after
    assert after.count('ask http://hubpages-dev:8080/api/domains/tls') == 1
    assert module.configure(after) == after
    assert 'on_demand' in after
for conflict in ['{ on_demand_tls { ask http://existing/ } }\n' + sites, 'https:// { respond "existing" }\n' + sites]:
    try:
        module.configure(conflict)
        raise AssertionError('Must preserve an existing catch-all or TLS policy')
    except ValueError:
        pass
for before in [sites, module.configure(sites)]:
    shared = module.configure(before, production=True)
    assert sites in shared
    assert module.configure(shared) == shared
    assert module.configure(shared, production=True) == shared
    assert 'ask http://hubpages-prod:8080/api/domains/tls' in shared
    assert 'request_header -X-HubPages-Upstream' in shared
    assert 'uri /api/domains/route?domain={host}' in shared
    assert 'header_up -X-HubPages-Upstream' in shared
    assert shared.count('https:// {') == 1
    assert 'X-Robots-Tag' not in module.SHARED_SITE
print('PASS: idempotent DEV-only proxy addition preserves all existing sites and rejects conflicting TLS/routes')

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        Path(sys.argv[1]).write_text(module.configure(sites, production=True))
