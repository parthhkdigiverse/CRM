import glob
import os

for filepath in glob.glob('c:/crm/backend/routers/*.py'):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '"is_deleted": False' in content:
        new_content = content.replace('"is_deleted": False', '"is_deleted": {"$ne": True}')
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {os.path.basename(filepath)}')
