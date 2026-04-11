
import logging
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from fastapi.exception_handlers import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from database import SessionLocal, init_db
import schemas
import models
import bleach
from datetime import timedelta
from sqlalchemy import and_, func

logging.basicConfig(level=logging.INFO)

app = FastAPI()

# CORS setup for frontend-backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



# Global error handler for unhandled exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error. Please contact support."})

# Validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# HTTPException handler for consistent error format
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

@app.get("/")
def read_root():
    return {"message": "Backend API is running securely."}

@app.post("/signup")
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        # Log the full incoming payload for debugging
        logging.info(f"Signup payload: {user.dict()}")
        # Check if user exists
        existing = db.query(models.User).filter_by(first_name=user.first_name, cellphone=user.cellphone).first()
        if existing:
            raise HTTPException(status_code=400, detail="User already exists")
        logging.info(f"Signup password: '{user.password}' (len={len(user.password)}, bytes={len(user.password.encode('utf-8'))})")
        hashed_password = pwd_context.hash(user.password)
        db_user = models.User(
            first_name=bleach.clean(user.first_name),
            last_name=bleach.clean(user.last_name),
            address=bleach.clean(user.address),
            cellphone=bleach.clean(user.cellphone),
            whatsapp=bleach.clean(user.whatsapp),
            email=bleach.clean(user.email) if user.email else None,
            password_hash=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return {"id": db_user.id, "first_name": db_user.first_name}
    except Exception as exc:
        import traceback
        logging.error("Signup error: %s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}")

@app.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter_by(first_name=user.first_name).first()
    if not db_user or not pwd_context.verify(user.password, db_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {"id": db_user.id, "first_name": db_user.first_name, "indemnity_signed": db_user.indemnity_signed}

# Booking Endpoints
@app.post("/book")
def create_booking(booking: schemas.BookingCreate, user_id: int, db: Session = Depends(get_db)):
    # Check if date is already booked
    existing = db.query(models.Booking).filter(and_(models.Booking.date == booking.date, models.Booking.timeslot == booking.timeslot)).first()
    if existing:
        # Suggest 3 alternative days (next available days for the same timeslot)
        alternatives = []
        day_offset = 1
        while len(alternatives) < 3 and day_offset <= 31:
            alt_date = booking.date + timedelta(days=day_offset)
            alt_exists = db.query(models.Booking).filter(and_(models.Booking.date == alt_date, models.Booking.timeslot == booking.timeslot)).first()
            if not alt_exists:
                alternatives.append(str(alt_date))
            day_offset += 1
        return {"error": "Date already booked", "alternatives": alternatives}
    db_booking = models.Booking(
        user_id=user_id,
        date=booking.date,
        timeslot=booking.timeslot,
        special_instructions=bleach.clean(booking.special_instructions) if booking.special_instructions else None
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return {"id": db_booking.id, "date": str(db_booking.date), "timeslot": db_booking.timeslot}

@app.get("/bookings/current")
def get_current_booking(user_id: int, db: Session = Depends(get_db)):
    today = func.current_date()
    booking = db.query(models.Booking).filter(and_(models.Booking.user_id == user_id, models.Booking.date >= today)).order_by(models.Booking.date.asc()).first()
    if not booking:
        return {"current": None}
    return {
        "id": booking.id,
        "date": str(booking.date),
        "timeslot": booking.timeslot,
        "status": booking.status,
        "special_instructions": booking.special_instructions
    }

@app.get("/bookings/previous")
def get_previous_bookings(user_id: int, db: Session = Depends(get_db)):
    today = func.current_date()
    bookings = db.query(models.Booking).filter(and_(models.Booking.user_id == user_id, models.Booking.date < today)).order_by(models.Booking.date.desc()).all()
    return [{
        "id": b.id,
        "date": str(b.date),
        "timeslot": b.timeslot,
        "status": b.status,
        "special_instructions": b.special_instructions
    } for b in bookings]

@app.put("/bookings/{booking_id}/note")
def update_booking_note(booking_id: int, note: str, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter_by(id=booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.special_instructions = bleach.clean(note)
    db.commit()
    return {"id": booking.id, "special_instructions": booking.special_instructions}

@app.post("/create_test_user")
def create_test_user(db: Session = Depends(get_db)):
    from sqlalchemy.exc import IntegrityError
    try:
        hashed_password = pwd_context.hash("TestPassword1")
        db_user = models.User(
            first_name="Alice",
            last_name="Smith",
            address="123 Main St",
            cellphone="5551112222",
            whatsapp="5551112222",
            email="alice@example.com",
            password_hash=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return {"id": db_user.id, "first_name": db_user.first_name, "email": db_user.email, "password": "TestPassword1"}
    except IntegrityError:
        db.rollback()
        return {"detail": "Test user already exists."}


    try:
        hashed_password = pwd_context.hash("TestPassword1")
        db_user = models.User(
            first_name="Alice",
            last_name="Smith",
            address="123 Main St",
            cellphone="5551112222",
            whatsapp="5551112222",
            email="alice@example.com",
            password_hash=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return {"id": db_user.id, "first_name": db_user.first_name, "email": db_user.email, "password": "TestPassword1"}
    except IntegrityError:
        db.rollback()
        return {"detail": "Test user already exists."}

@app.get("/healthz")
def health_check():
    return {"status": "ok"}



@app.get("/")
def read_root():
    return {"message": "Backend API is running securely."}

@app.post("/signup")
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing = db.query(models.User).filter_by(first_name=user.first_name, cellphone=user.cellphone).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(
        first_name=bleach.clean(user.first_name),
        last_name=bleach.clean(user.last_name),
        address=bleach.clean(user.address),
        cellphone=bleach.clean(user.cellphone),
        whatsapp=bleach.clean(user.whatsapp),
        email=bleach.clean(user.email) if user.email else None,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"id": db_user.id, "first_name": db_user.first_name}

@app.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter_by(first_name=user.first_name).first()
    if not db_user or not pwd_context.verify(user.password, db_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {"id": db_user.id, "first_name": db_user.first_name, "indemnity_signed": db_user.indemnity_signed}


# Booking Endpoints
from datetime import timedelta
from sqlalchemy import and_, func

@app.post("/book")
def create_booking(booking: schemas.BookingCreate, user_id: int, db: Session = Depends(get_db)):
    # Check if date is already booked
    existing = db.query(models.Booking).filter(and_(models.Booking.date == booking.date, models.Booking.timeslot == booking.timeslot)).first()
    if existing:
        # Suggest 3 alternative days (next available days for the same timeslot)
        alternatives = []
        day_offset = 1
        while len(alternatives) < 3 and day_offset <= 31:
            alt_date = booking.date + timedelta(days=day_offset)
            alt_exists = db.query(models.Booking).filter(and_(models.Booking.date == alt_date, models.Booking.timeslot == booking.timeslot)).first()
            if not alt_exists:
                alternatives.append(str(alt_date))
            day_offset += 1
        return {"error": "Date already booked", "alternatives": alternatives}
    db_booking = models.Booking(
        user_id=user_id,
        date=booking.date,
        timeslot=booking.timeslot,
        special_instructions=bleach.clean(booking.special_instructions) if booking.special_instructions else None
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return {"id": db_booking.id, "date": str(db_booking.date), "timeslot": db_booking.timeslot}

@app.get("/bookings/current")
def get_current_booking(user_id: int, db: Session = Depends(get_db)):
    today = func.current_date()
    booking = db.query(models.Booking).filter(and_(models.Booking.user_id == user_id, models.Booking.date >= today)).order_by(models.Booking.date.asc()).first()
    if not booking:
        return {"current": None}
    return {
        "id": booking.id,
        "date": str(booking.date),
        "timeslot": booking.timeslot,
        "status": booking.status,
        "special_instructions": booking.special_instructions
    }

@app.get("/bookings/previous")
def get_previous_bookings(user_id: int, db: Session = Depends(get_db)):
    today = func.current_date()
    bookings = db.query(models.Booking).filter(and_(models.Booking.user_id == user_id, models.Booking.date < today)).order_by(models.Booking.date.desc()).all()
    return [{
        "id": b.id,
        "date": str(b.date),
        "timeslot": b.timeslot,
        "status": b.status,
        "special_instructions": b.special_instructions
    } for b in bookings]

@app.put("/bookings/{booking_id}/note")
def update_booking_note(booking_id: int, note: str, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter_by(id=booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.special_instructions = bleach.clean(note)
    db.commit()
    return {"id": booking.id, "special_instructions": booking.special_instructions}
