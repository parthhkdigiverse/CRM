import re

def update_attendance():
    path = 'c:\\crm\\backend\\routers\\attendance.py'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Check-in
    checkin_pattern = r'(employee = await Employee\.find_one\(org_filter\(org, \{"_id": PydanticObjectId\(data\.employee_id\)\}\)\)\n\s+if not employee:\n\s+raise HTTPException\(status_code=404, detail="Employee not found"\))'
    checkin_replace = r'\1\n        if current_user.role == "employee" and employee.user_id != current_user.id:\n            raise HTTPException(status_code=403, detail="You can only check-in for yourself")'
    content = re.sub(checkin_pattern, checkin_replace, content)
    
    # Check-out (uses the same block as check-in for finding employee, but wait, it's identical text? let's see. yes it is)
    # The checkin_pattern will match both check-in and check-out
    
    # get_today_attendance
    # 1. Fetch all active employees
    today_pattern = r'(employees = await Employee\.find\(org_filter\(org\)\)\.to_list\(\))'
    today_replace = r'emp_query = org_filter(org)\n    if current_user.role == "employee":\n        emp_query["user_id"] = current_user.id\n    \1\n    employees = await Employee.find(emp_query).to_list()'
    
    # Actually wait, the regex replacement for \1 replaces the original, I don't want to redefine employees.
    today_replace = r'emp_query = org_filter(org)\n    if current_user.role == "employee":\n        emp_query["user_id"] = current_user.id\n    employees = await Employee.find(emp_query).to_list()'
    content = re.sub(today_pattern, today_replace, content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def update_target():
    path = 'c:\\crm\\backend\\routers\\target.py'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    list_pattern = r'(query = org_filter\(org\))'
    list_replace = r'\1\n    if current_user.role == "employee":\n        query["owner"] = current_user.id'
    content = re.sub(list_pattern, list_replace, content)
    
    item_pattern = r'(target = await Target\.find_one\(org_filter\(org, \{"_id": PydanticObjectId\(target_id\)\}\)\)\n\s+if not target:\n\s+raise HTTPException\(status_code=404, detail="Target not found"\))'
    item_replace = r'\1\n\n    if current_user.role == "employee" and target.owner != current_user.id:\n        raise HTTPException(status_code=403, detail="You do not have permission to access this target")'
    content = re.sub(item_pattern, item_replace, content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def update_meeting():
    path = 'c:\\crm\\backend\\routers\\meeting.py'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    list_pattern = r'(query = org_filter\(org\))'
    list_replace = r'\1\n    if current_user.role == "employee":\n        query["$or"] = [{"created_by": current_user.id}, {"attendee_ids": current_user.id}]'
    content = re.sub(list_pattern, list_replace, content)
    
    item_pattern = r'(meeting = await Meeting\.find_one\(org_filter\(org, \{"_id": PydanticObjectId\(meeting_id\)\}\)\)\n\s+if not meeting:\n\s+raise HTTPException\(status_code=404, detail="Meeting not found"\))'
    item_replace = r'\1\n\n    if current_user.role == "employee" and current_user.id not in meeting.attendee_ids and meeting.created_by != current_user.id:\n        raise HTTPException(status_code=403, detail="You do not have permission to access this meeting")'
    content = re.sub(item_pattern, item_replace, content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


update_attendance()
update_target()
update_meeting()
print("RBAC patches applied to Attendance, Target, Meeting")
