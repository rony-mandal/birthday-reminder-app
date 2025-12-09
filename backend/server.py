from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import base64
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Birthday Reminder API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Scheduler
scheduler = AsyncIOScheduler()

# Models
class Birthday(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    birth_date: str  # Format: YYYY-MM-DD
    relation: str
    photo_url: Optional[str] = None
    custom_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_reminder_sent: Optional[str] = None  # Year when last sent

class BirthdayCreate(BaseModel):
    name: str
    birth_date: str
    relation: str
    photo_url: Optional[str] = None
    custom_message: Optional[str] = None

class BirthdayUpdate(BaseModel):
    name: Optional[str] = None
    birth_date: Optional[str] = None
    relation: Optional[str] = None
    photo_url: Optional[str] = None
    custom_message: Optional[str] = None

class EmailSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gmail_address: str
    app_password: str
    recipient_emails: List[str] = []
    is_configured: bool = True

class EmailSettingsUpdate(BaseModel):
    gmail_address: Optional[str] = None
    app_password: Optional[str] = None
    recipient_emails: Optional[List[str]] = None

class MessageTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    subject: str
    body: str
    is_default: bool = False

class MessageTemplateCreate(BaseModel):
    name: str
    subject: str
    body: str
    is_default: bool = False

# Helper functions
async def send_birthday_email(birthday: dict, settings: dict):
    """Send birthday reminder email"""
    try:
        if not settings or not settings.get('gmail_address') or not settings.get('app_password'):
            logger.warning("Email settings not configured")
            return False
        
        recipients = settings.get('recipient_emails', [])
        if not recipients:
            recipients = [settings['gmail_address']]
        
        # Get custom message or default
        custom_msg = birthday.get('custom_message', '')
        
        # Create email content
        birth_date = datetime.strptime(birthday['birth_date'], '%Y-%m-%d')
        today = datetime.now()
        age = today.year - birth_date.year
        
        subject = f"🎂 Birthday Reminder: {birthday['name']}'s Birthday is Today!"
        
        html_body = f"""
        <html>
        <body style="font-family: 'Outfit', Arial, sans-serif; background-color: #FFFDF5; padding: 40px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border: 3px solid black; padding: 30px; box-shadow: 8px 8px 0px 0px black;">
                <h1 style="font-family: 'Lexend Mega', sans-serif; color: #FF6B6B; margin: 0 0 20px 0;">🎉 BIRTHDAY ALERT!</h1>
                <div style="background: #A3E635; border: 2px solid black; padding: 20px; margin: 20px 0;">
                    <h2 style="margin: 0; color: #1A1A1A;">{birthday['name']}</h2>
                    <p style="margin: 5px 0; font-size: 14px;">Relationship: {birthday['relation']}</p>
                    <p style="margin: 5px 0; font-size: 14px;">Turning: {age} years old</p>
                </div>
                {f'<p style="font-style: italic; background: #FFE66D; padding: 15px; border: 2px solid black;">{custom_msg}</p>' if custom_msg else ''}
                <p style="color: #666;">Don't forget to send your wishes! 🎁</p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 2px dashed black;">
                    <p style="font-size: 12px; color: #999;">Sent by Birthday Reminder App</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        message = MIMEMultipart('alternative')
        message['Subject'] = subject
        message['From'] = settings['gmail_address']
        message['To'] = ', '.join(recipients)
        
        html_part = MIMEText(html_body, 'html')
        message.attach(html_part)
        
        await aiosmtplib.send(
            message,
            hostname='smtp.gmail.com',
            port=587,
            start_tls=True,
            username=settings['gmail_address'],
            password=settings['app_password']
        )
        
        logger.info(f"Birthday reminder sent for {birthday['name']}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False

async def check_birthdays():
    """Check for upcoming birthdays and send reminders"""
    try:
        logger.info("Checking for upcoming birthdays...")
        
        # Get email settings
        settings = await db.email_settings.find_one({})
        if not settings:
            logger.info("No email settings configured")
            return
        
        now = datetime.now(timezone.utc)
        today = now.date()
        current_year = str(today.year)
        
        # Check birthdays 6 hours ahead
        check_time = now + timedelta(hours=6)
        check_date = check_time.date()
        
        # Get all birthdays
        birthdays = await db.birthdays.find({}).to_list(1000)
        
        for birthday in birthdays:
            try:
                birth_date = datetime.strptime(birthday['birth_date'], '%Y-%m-%d').date()
                # Check if birthday is today or in the next 6 hours (same day check)
                if (birth_date.month == check_date.month and birth_date.day == check_date.day):
                    # Check if we already sent reminder this year
                    if birthday.get('last_reminder_sent') != current_year:
                        success = await send_birthday_email(birthday, settings)
                        if success:
                            await db.birthdays.update_one(
                                {'id': birthday['id']},
                                {'$set': {'last_reminder_sent': current_year}}
                            )
            except Exception as e:
                logger.error(f"Error processing birthday {birthday.get('name')}: {e}")
                
    except Exception as e:
        logger.error(f"Error in check_birthdays: {e}")

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Birthday Reminder API"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Birthday CRUD
@api_router.post("/birthdays", response_model=Birthday)
async def create_birthday(birthday: BirthdayCreate):
    birthday_obj = Birthday(**birthday.model_dump())
    doc = birthday_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.birthdays.insert_one(doc)
    return birthday_obj

@api_router.get("/birthdays", response_model=List[Birthday])
async def get_birthdays():
    birthdays = await db.birthdays.find({}, {"_id": 0}).to_list(1000)
    for b in birthdays:
        if isinstance(b.get('created_at'), str):
            b['created_at'] = datetime.fromisoformat(b['created_at'])
    return birthdays

@api_router.get("/birthdays/{birthday_id}", response_model=Birthday)
async def get_birthday(birthday_id: str):
    birthday = await db.birthdays.find_one({"id": birthday_id}, {"_id": 0})
    if not birthday:
        raise HTTPException(status_code=404, detail="Birthday not found")
    if isinstance(birthday.get('created_at'), str):
        birthday['created_at'] = datetime.fromisoformat(birthday['created_at'])
    return birthday

@api_router.put("/birthdays/{birthday_id}", response_model=Birthday)
async def update_birthday(birthday_id: str, update: BirthdayUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.birthdays.update_one(
        {"id": birthday_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Birthday not found")
    
    birthday = await db.birthdays.find_one({"id": birthday_id}, {"_id": 0})
    if isinstance(birthday.get('created_at'), str):
        birthday['created_at'] = datetime.fromisoformat(birthday['created_at'])
    return birthday

@api_router.delete("/birthdays/{birthday_id}")
async def delete_birthday(birthday_id: str):
    result = await db.birthdays.delete_one({"id": birthday_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Birthday not found")
    return {"message": "Birthday deleted successfully"}

# Upcoming birthdays
@api_router.get("/birthdays/upcoming/list")
async def get_upcoming_birthdays(days: int = 30):
    birthdays = await db.birthdays.find({}, {"_id": 0}).to_list(1000)
    today = datetime.now().date()
    upcoming = []
    
    for b in birthdays:
        try:
            birth_date = datetime.strptime(b['birth_date'], '%Y-%m-%d').date()
            # Calculate this year's birthday
            this_year_bday = birth_date.replace(year=today.year)
            if this_year_bday < today:
                this_year_bday = birth_date.replace(year=today.year + 1)
            
            days_until = (this_year_bday - today).days
            if 0 <= days_until <= days:
                b['days_until'] = days_until
                b['upcoming_date'] = this_year_bday.isoformat()
                b['age'] = this_year_bday.year - birth_date.year
                upcoming.append(b)
        except Exception as e:
            logger.error(f"Error calculating upcoming for {b.get('name')}: {e}")
    
    # Sort by days until
    upcoming.sort(key=lambda x: x['days_until'])
    return upcoming

# Email Settings
@api_router.get("/settings/email")
async def get_email_settings():
    settings = await db.email_settings.find_one({}, {"_id": 0})
    if not settings:
        return {"is_configured": False, "gmail_address": "", "recipient_emails": []}
    # Don't send password back
    return {
        "is_configured": True,
        "gmail_address": settings.get('gmail_address', ''),
        "recipient_emails": settings.get('recipient_emails', []),
        "id": settings.get('id')
    }

@api_router.post("/settings/email")
async def save_email_settings(settings: EmailSettings):
    # Delete existing and insert new
    await db.email_settings.delete_many({})
    doc = settings.model_dump()
    await db.email_settings.insert_one(doc)
    return {"message": "Email settings saved", "is_configured": True}

@api_router.put("/settings/email")
async def update_email_settings(update: EmailSettingsUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.email_settings.update_one({}, {"$set": update_data})
    if result.matched_count == 0:
        # Create new settings
        settings = EmailSettings(**update_data)
        await db.email_settings.insert_one(settings.model_dump())
    
    return {"message": "Email settings updated"}

@api_router.post("/settings/email/add-recipient")
async def add_recipient(email: str):
    result = await db.email_settings.update_one(
        {},
        {"$addToSet": {"recipient_emails": email}}
    )
    return {"message": "Recipient added"}

@api_router.post("/settings/email/remove-recipient")
async def remove_recipient(email: str):
    result = await db.email_settings.update_one(
        {},
        {"$pull": {"recipient_emails": email}}
    )
    return {"message": "Recipient removed"}

@api_router.post("/settings/email/test")
async def test_email():
    """Send a test email"""
    settings = await db.email_settings.find_one({})
    if not settings:
        raise HTTPException(status_code=400, detail="Email settings not configured")
    
    test_birthday = {
        'name': 'Test Person',
        'birth_date': datetime.now().strftime('%Y-%m-%d'),
        'relation': 'Test',
        'custom_message': 'This is a test email from your Birthday Reminder App!'
    }
    
    success = await send_birthday_email(test_birthday, settings)
    if success:
        return {"message": "Test email sent successfully!"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send test email. Check your credentials.")

# Message Templates
@api_router.get("/templates", response_model=List[MessageTemplate])
async def get_templates():
    templates = await db.message_templates.find({}, {"_id": 0}).to_list(100)
    if not templates:
        # Create default templates
        default_templates = [
            {
                "id": str(uuid.uuid4()),
                "name": "Classic Birthday",
                "subject": "🎂 Happy Birthday {name}!",
                "body": "Wishing you a wonderful birthday filled with joy and happiness! May all your dreams come true. 🎉",
                "is_default": True
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Professional",
                "subject": "Birthday Wishes for {name}",
                "body": "Warmest birthday wishes to you! May this special day bring you success and happiness.",
                "is_default": False
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Fun & Casual",
                "subject": "🎈 Party Time! It's {name}'s Birthday!",
                "body": "Let's celebrate! Another year of being awesome. Time to party! 🥳🎊",
                "is_default": False
            }
        ]
        await db.message_templates.insert_many(default_templates)
        return default_templates
    return templates

@api_router.post("/templates", response_model=MessageTemplate)
async def create_template(template: MessageTemplateCreate):
    template_obj = MessageTemplate(**template.model_dump())
    await db.message_templates.insert_one(template_obj.model_dump())
    return template_obj

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    result = await db.message_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}

# Manual reminder trigger
@api_router.post("/birthdays/{birthday_id}/send-reminder")
async def send_manual_reminder(birthday_id: str):
    birthday = await db.birthdays.find_one({"id": birthday_id}, {"_id": 0})
    if not birthday:
        raise HTTPException(status_code=404, detail="Birthday not found")
    
    settings = await db.email_settings.find_one({})
    if not settings:
        raise HTTPException(status_code=400, detail="Email settings not configured")
    
    success = await send_birthday_email(birthday, settings)
    if success:
        return {"message": "Reminder sent successfully!"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send reminder")

# Trigger birthday check manually
@api_router.post("/check-birthdays")
async def trigger_birthday_check():
    await check_birthdays()
    return {"message": "Birthday check completed"}

# Photo upload (base64)
@api_router.post("/upload-photo")
async def upload_photo(file: UploadFile = File(...)):
    contents = await file.read()
    base64_encoded = base64.b64encode(contents).decode('utf-8')
    content_type = file.content_type or 'image/jpeg'
    data_url = f"data:{content_type};base64,{base64_encoded}"
    return {"photo_url": data_url}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Start the scheduler
    scheduler.add_job(
        check_birthdays,
        IntervalTrigger(hours=1),  # Check every hour
        id='birthday_check',
        replace_existing=True
    )
    scheduler.start()
    logger.info("Birthday scheduler started")

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
    client.close()
    logger.info("Shutdown complete")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)