import importlib.util
from copy import deepcopy
spec=importlib.util.spec_from_file_location('isolation','deploy/dev-isolation.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
rows=[]
for env in ('dev','prod'):
    for service in ('hubpages-'+env,'hubpages-db'):
        rows.append({'name':f'hubpages_{env}-{service}-1','labels':{'com.docker.compose.project':'hubpages_'+env},'mounts':[{'Name':f'hubpages_{env}_'+('content' if service!='hubpages-db' else 'hubpages_postgres')}],'networks':{f'hubpages_{env}_hubpages_database':{}},'ports':None})
assert module.verify(rows)
for change in ('network','volume','port','project'):
    bad=deepcopy(rows)
    if change=='network':bad[1]['networks']={'sistera_vps_sistera_internal':{}}
    if change=='volume':bad[1]['mounts']=bad[3]['mounts']
    if change=='port':bad[1]['ports']={'5432/tcp':[{'HostPort':'5432'}]}
    if change=='project':bad[0]['labels']['com.docker.compose.project']='hubpages_prod'
    try:module.verify(bad)
    except AssertionError:pass
    else:raise AssertionError('Isolation must fail: '+change)
print('PASS: DEV projects, volumes, private database network and ports fail closed')
