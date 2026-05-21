import os
import re

backend_dir = r"c:\crm\backend"
routers_dir = os.path.join(backend_dir, "routers")

modules_map = {
    "lead": "leads",
    "contact": "contacts",
    "company": "companies",
    "deal": "deals",
    "invoice": "invoices",
    "task": "tasks",
    "employee": "employees",
    "attendance": "attendance",
    "project": "projects",
    "meeting": "meetings",
    "document": "documents",
    "ai": "ai",
    "audit_log": "audit_logs",
    "target": "targets"
}

for filename, module_name in modules_map.items():
    filepath = os.path.join(routers_dir, f"{filename}.py")
    if not os.path.exists(filepath):
        continue
        
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Inject import
    if "from middleware.rbac import" not in content:
        auth_idx = content.find("from middleware.auth_middleware import")
        if auth_idx != -1:
            end_idx = content.find("\n", auth_idx)
            content = content[:end_idx+1] + "from middleware.rbac import require_module_read, require_module_write, require_module_full\n" + content[end_idx+1:]
        else:
            content = "from middleware.rbac import require_module_read, require_module_write, require_module_full\n" + content

    # In endpoints, we have: `current_user: User = Depends(get_current_user)`
    # But wait, how do we distinguish GET vs POST?
    # We can use regex on the function definitions.
    
    # Let's find all function defs
    def_blocks = list(re.finditer(r'@router\.(get|post|put|delete|patch)[^@]*?def\s+\w+\(.*?\):', content, re.DOTALL))
    
    for match in reversed(def_blocks): # Process from bottom up to avoid index invalidation
        block = match.group(0)
        method = match.group(1).lower()
        
        # Determine appropriate dependency
        if method == "get":
            dep = f'require_module_read("{module_name}")'
        else:
            dep = f'require_module_write("{module_name}")'
            
        # Replace `get_current_user` with our `dep` in this block
        new_block = re.sub(r'Depends\(get_current_user\)', f'Depends({dep})', block)
        
        content = content[:match.start()] + new_block + content[match.end():]

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
        
print("Routes refactored successfully.")
