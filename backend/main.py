
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from database import SessionLocal, init_db
import schemas
import models
import bleach

app = FastAPI()

# CORS setup for frontend-backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

@app.on_event("startup")
def on_startup():
    init_db()

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
