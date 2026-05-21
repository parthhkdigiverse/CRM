import os
import re

files = ['project.py', 'target.py', 'ai.py', 'organization.py']

for file in files:
    path = os.path.join('routers', file)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Imports
    if 'org_filter' not in content:
        content = content.replace('get_current_org\n', 'get_current_org, org_filter\n')
        content = content.replace('get_current_org, require_roles\n', 'get_current_org, require_roles, org_filter\n')

    # 2. Add typing if needed
    if 'from typing import Optional' not in content and 'Optional[' in content:
        # maybe it's already there
        pass
    elif 'Optional[' not in content:
        content = 'from typing import Optional\n' + content

    # 3. Change Depends(get_current_org) to Optional
    content = content.replace('org: Organization = Depends(get_current_org)', 'org: Optional[Organization] = Depends(get_current_org)')

    # 4. Handle org.id safely in insert/log
    content = re.sub(r'org_id=org\.id,', 'org_id=org.id if org else None,', content)
    content = re.sub(r'str\(org\.id\)(?=,.*\"(create|update|delete)\")', 'str(org.id) if org else \"super_admin\"', content)

    # 5. Handle queries
    content = re.sub(r'query\s*=\s*\{\"org_id\":\s*org\.id,\s*\"is_deleted\":\s*\{\"\$ne\":\s*True\}\}', 'query = org_filter(org)', content)
    
    # 6. Handle Beanie find queries
    # Model.find_one(Model.id == PydanticObjectId(id), Model.org_id == org.id, Model.is_deleted == False)
    content = re.sub(r'([A-Za-z0-9_]+)\.find_one\(\1\.id == PydanticObjectId\(([A-Za-z0-9_]+)\),\s*\1\.org_id == org\.id,\s*\1\.is_deleted == False\)', r'\1.find_one(org_filter(org, {"_id": PydanticObjectId(\2)}))', content)

    # Let's save back
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {file}")
