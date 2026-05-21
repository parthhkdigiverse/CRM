import sys
sys.path.append('.')
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import database
from models.payroll import Payroll
from models.employee import Employee
from beanie import PydanticObjectId

async def run():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    await init_beanie(database=client['crm_db'], document_models=database.ALL_MODELS)
    
    payrolls = await Payroll.find().to_list()
    
    print(f"{'Employee':<20} | {'Basic (Rs)':<10} | {'W.Days':<6} | {'Leaves':<6} | {'Deductions (Rs)':<14} | {'Net Pay (Rs)':<10}")
    print('-'*80)
    
    for p in payrolls:
        emp = None
        try:
            emp = await Employee.get(PydanticObjectId(p.employee_id))
        except:
            pass
        name = emp.name if emp else 'Unknown'
        print(f"{name:<20} | {p.basic:<10.2f} | {p.working_days:<6} | {p.leaves:<6} | {p.deductions:<14.2f} | {p.net_pay:<10.2f}")

if __name__ == '__main__':
    asyncio.run(run())
