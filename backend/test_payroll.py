import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models.user import User
from models.employee import Employee
from models.payroll import Payroll
from models.organization import Organization
import database

async def test():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    await init_beanie(database=client['crm_db'], document_models=database.ALL_MODELS)
    
    payrolls = await Payroll.find().to_list()
    print("Payrolls count:", len(payrolls))
    
    from beanie import PydanticObjectId
    for p in payrolls:
        try:
            emp = await Employee.get(PydanticObjectId(p.employee_id))
            print("Employee found:", emp.first_name if emp else "None")
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test())
