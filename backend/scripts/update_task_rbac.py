import re

def add_employee_task_check():
    path = 'c:\\crm\\backend\\routers\\task.py'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Get endpoints (get_task, update_task, delete_task, add_task_comment)
    pattern = r'(task = await Task\.find_one\(org_filter\(org, \{"_id": PydanticObjectId\(task_id\)\}\)\)\n\s+if not task:\n\s+raise HTTPException\(status_code=404, detail="Task not found"\))'
    
    replacement = r'\1\n\n    if current_user.role == "employee" and task.assigned_to != current_user.id:\n        raise HTTPException(status_code=403, detail="You do not have permission to access this task")'
    
    content = re.sub(pattern, replacement, content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
add_employee_task_check()
