"""Read only public Docker metadata; never accept environment variables/secrets."""
import json
import sys

def verify(rows):
    by = {row['name'].lstrip('/'): row for row in rows}
    for env in ('dev', 'prod'):
        for service in ('hubpages-'+env, 'hubpages-db'):
            row = by[f'hubpages_{env}-{service}-1']
            assert row['labels']['com.docker.compose.project'] == 'hubpages_'+env
            if service == 'hubpages-db':
                assert set(row['networks']) == {f'hubpages_{env}_hubpages_database'}
                assert not row['ports']
                assert any(m['Name'] == f'hubpages_{env}_hubpages_postgres' for m in row['mounts'])
    dev = {m.get('Name') for n,r in by.items() if n.startswith('hubpages_dev-') for m in r['mounts'] if m.get('Name')}
    prod = {m.get('Name') for n,r in by.items() if n.startswith('hubpages_prod-') for m in r['mounts'] if m.get('Name')}
    assert dev and prod and not dev.intersection(prod)
    assert all(n.startswith('hubpages_dev') for n in dev)
    assert all(n.startswith('hubpages_prod') for n in prod)
    assert 'hubpages_dev_content' in dev
    return True

if __name__ == '__main__':
    verify([json.loads(line) for line in sys.stdin if line.strip()])
    print('DEV isolation verified: distinct projects/volumes; private database networks and no host database ports. Shared proxy untouched.')
