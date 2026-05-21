import sys
sys.path.append('.')
import asyncio
import database
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models.employee import Employee
from models.payroll import Payroll
from utils.security import decrypt_field
from config import settings

async def run():
    await init_beanie(database=AsyncIOMotorClient(settings.MONGODB_URL)[settings.MONGODB_DB_NAME], document_models=database.ALL_MODELS)
    
    payrolls = await Payroll.find().to_list()
    for p in payrolls:
        emp = await Employee.get(p.employee_id)
        if emp and emp.salary_encrypted:
            try:
                actual_basic = float(decrypt_field(emp.salary_encrypted))
                if p.basic != actual_basic:
                    print(f"Updating payroll for {emp.name}: Basic {p.basic} -> {actual_basic}")
                    p.basic = actual_basic
                    # recalculate
                    p.deductions = (p.basic / p.working_days) * p.leaves
                    p.net_pay = p.basic - p.deductions
                    await p.save()
            except Exception as e:
                print(f"Error for {emp.name}: {e}")

if __name__ == '__main__':
    asyncio.run(run())
