# --- ADMIN ENDPOINTS ---

@app.get("/admin/users")
def admin_list_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    users = db.query(models.User).all()
    return [{"id": u.id, "role": u.role, "name": u.name, "email": u.email} for u in users]

@app.get("/admin/bookings")
def admin_list_bookings(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    bookings = db.query(models.Booking).all()
    return [{"id": b.id, "status": b.status, "user_id": b.user_id, "cleaner_id": b.cleaner_id} for b in bookings]

@app.put("/admin/bookings/{id}/assign")
def admin_assign_cleaner(id: int, data: dict = Body(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    booking = db.query(models.Booking).filter(models.Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    cleaner_id = data.get("cleaner_id")
    if not cleaner_id:
        raise HTTPException(status_code=400, detail="Missing cleaner_id")
    booking.cleaner_id = cleaner_id
    booking.status = "assigned"
    db.commit()
    db.refresh(booking)
    return {"id": booking.id, "status": booking.status, "cleaner_id": booking.cleaner_id}

@app.put("/admin/contracts/{id}/update")
def admin_update_contract(id: int, data: dict = Body(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    contract = db.query(models.Contract).filter(models.Contract.id == id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if "rate" in data:
        contract.rate = data["rate"]
    if "weekend_multiplier" in data:
        contract.weekend_multiplier = data["weekend_multiplier"]
    db.commit()
    db.refresh(contract)
    return {"id": contract.id, "rate": float(contract.rate), "weekend_multiplier": float(contract.weekend_multiplier)}

@app.put("/admin/payroll/{id}/amend")
def admin_amend_payroll(id: int, data: dict = Body(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    payroll = db.query(models.Payroll).filter(models.Payroll.id == id).first()
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll not found")
    if "deductions" in data:
        payroll.deductions = data["deductions"]
    if "total" in data:
        payroll.total = data["total"]
    db.commit()
    db.refresh(payroll)
    return {"id": payroll.id, "total": float(payroll.total)}

# --- NOTIFICATIONS ENDPOINT ---
from notifications import send_whatsapp_message, send_email

@app.post("/notifications/send")
def send_notification(data: dict = Body(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user = db.query(models.User).filter(models.User.id == data.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    channel = data.get("channel")
    message = data.get("message")
    if channel == "whatsapp":
        sent = send_whatsapp_message(user.phone, message)
    elif channel == "email":
        sent = send_email(user.email, "Notification", message)
    else:
        raise HTTPException(status_code=400, detail="Invalid channel")
    # Log notification
    notif = models.Notification(user_id=user.id, channel=channel, message=message, status="sent" if sent else "failed")
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return {"id": notif.id, "status": notif.status}

# --- ZOHO ENDPOINTS (REAL) ---
import httpx
import os

ZOHO_ORG_ID = os.getenv("ZOHO_ORG_ID")
ZOHO_BOOKS_API_KEY = os.getenv("ZOHO_BOOKS_API_KEY")
ZOHO_BOOKS_BASE = "https://books.zoho.com/api/v3"
ZOHO_EMAIL = os.getenv("ZOHO_EMAIL", "it@scratchsolid.co.za")

@app.post("/zoho/invoice")
def zoho_invoice(data: dict = Body(...), current_user: models.User = Depends(get_current_user)):
    """
    Create an invoice in Zoho Books. Requires ZOHO_ORG_ID and ZOHO_BOOKS_API_KEY in env.
    """
    if not ZOHO_ORG_ID or not ZOHO_BOOKS_API_KEY:
        raise HTTPException(status_code=500, detail="Zoho Books credentials not configured")
    headers = {
        "Authorization": f"Zoho-oauthtoken {ZOHO_BOOKS_API_KEY}",
        "X-com-zoho-books-organizationid": ZOHO_ORG_ID,
        "Content-Type": "application/json"
    }
    payload = {
        "customer_id": data.get("customer_id"),
        "line_items": data.get("line_items", []),
        "email": data.get("email", ZOHO_EMAIL),
        # Add more fields as needed
    }
    try:
        resp = httpx.post(f"{ZOHO_BOOKS_BASE}/invoices", headers=headers, json=payload, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Zoho Books error: {e}")

@app.post("/zoho/refund")
def zoho_refund(data: dict = Body(...), current_user: models.User = Depends(get_current_user)):
    """
    Issue a refund in Zoho Books. Requires ZOHO_ORG_ID and ZOHO_BOOKS_API_KEY in env.
    """
    if not ZOHO_ORG_ID or not ZOHO_BOOKS_API_KEY:
        raise HTTPException(status_code=500, detail="Zoho Books credentials not configured")
    headers = {
        "Authorization": f"Zoho-oauthtoken {ZOHO_BOOKS_API_KEY}",
        "X-com-zoho-books-organizationid": ZOHO_ORG_ID,
        "Content-Type": "application/json"
    }
    creditnote_id = data.get("creditnote_id")
    payload = {
        "amount": data.get("amount"),
        "date": data.get("date"),
        # Add more fields as needed
    }
    try:
        resp = httpx.post(f"{ZOHO_BOOKS_BASE}/creditnotes/{creditnote_id}/refunds", headers=headers, json=payload, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Zoho Books error: {e}")
# --- CLEANER ENDPOINTS ---

@app.post("/cleaner/login")
def cleaner_login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email, models.User.role == "cleaner").first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": db_user.id, "role": db_user.role})
    cleaner = db.query(models.Cleaner).filter(models.Cleaner.user_id == db_user.id).first()
    return {"token": access_token, "cleaner_id": cleaner.id if cleaner else None}

@app.put("/cleaner/{id}/status", response_model=schemas.CleanerResponse)
def update_cleaner_status(id: int, update: schemas.CleanerUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Only allow the cleaner to update their own status
    cleaner = db.query(models.Cleaner).filter(models.Cleaner.id == id).first()
    if not cleaner or cleaner.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this cleaner")
    if update.status:
        cleaner.status = update.status
    if update.gps_lat:
        cleaner.gps_lat = update.gps_lat
    if update.gps_long:
        cleaner.gps_long = update.gps_long
    if update.blocked is not None:
        cleaner.blocked = update.blocked
    if update.profile_picture:
        cleaner.profile_picture = update.profile_picture
    db.commit()
    db.refresh(cleaner)
    return cleaner

@app.get("/cleaner/{id}/dashboard", response_model=schemas.CleanerResponse)
def get_cleaner_dashboard(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Only allow the cleaner or admin to view
    cleaner = db.query(models.Cleaner).filter(models.Cleaner.id == id).first()
    if not cleaner or (cleaner.user_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to view this dashboard")
    return cleaner
# --- BUSINESS & CONTRACTS ENDPOINTS ---

@app.post("/business/signup", response_model=schemas.UserResponse)
def business_signup(business: schemas.UserCreate, db: Session = Depends(get_db)):
    if business.role != "business":
        raise HTTPException(status_code=400, detail="Role must be 'business'")
    if db.query(models.User).filter(models.User.email == business.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user = models.User(
        role="business",
        name=business.name,
        email=business.email,
        password_hash=get_password_hash(business.password),
        phone=business.phone,
        address=business.address,
        business_name=business.business_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/contracts/create", response_model=schemas.ContractResponse)
def create_contract(contract: schemas.ContractCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Only allow business user to create contract for themselves
    if current_user.role != "business" or contract.business_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to create contract")
    db_contract = models.Contract(
        business_id=contract.business_id,
        contract_type=contract.contract_type,
        start_date=contract.start_date,
        end_date=contract.end_date,
        rate=contract.rate,
        weekend_multiplier=contract.weekend_multiplier
    )
    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)
    return db_contract

@app.get("/contracts/{id}", response_model=schemas.ContractResponse)
def get_contract(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    contract = db.query(models.Contract).filter(models.Contract.id == id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    # Only allow business owner or admin to view
    if contract.business_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this contract")
    return contract

@app.put("/contracts/{id}", response_model=schemas.ContractResponse)
def update_contract(id: int, update: schemas.ContractUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    contract = db.query(models.Contract).filter(models.Contract.id == id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    # Only admin can update contract
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update contract")
    if update.rate:
        contract.rate = update.rate
    if update.weekend_multiplier:
        contract.weekend_multiplier = update.weekend_multiplier
    db.commit()
    db.refresh(contract)
    return contract
# --- BOOKING ENDPOINTS ---
from fastapi import Path

@app.post("/booking/create", response_model=schemas.BookingResponse)
def create_booking(booking: schemas.BookingCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Only allow user to create their own booking
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot create booking for another user")
    db_booking = models.Booking(
        user_id=booking.user_id,
        booking_type=booking.booking_type,
        cleaning_type=booking.cleaning_type,
        payment_method=booking.payment_method,
        loyalty_discount_applied=booking.loyalty_discount_applied,
        status="pending",
        start_time=booking.start_time,
        end_time=booking.end_time,
        special_instructions=booking.special_instructions
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking

@app.get("/booking/{id}", response_model=schemas.BookingResponse)
def get_booking(id: int = Path(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    booking = db.query(models.Booking).filter(models.Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    # Only allow user, assigned cleaner, or admin to view
    if booking.user_id != current_user.id and booking.cleaner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this booking")
    return booking

@app.put("/booking/{id}", response_model=schemas.BookingResponse)
def update_booking(id: int, update: schemas.BookingUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    booking = db.query(models.Booking).filter(models.Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    # Only allow user, assigned cleaner, or admin to update
    if booking.user_id != current_user.id and booking.cleaner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update this booking")
    if update.status:
        booking.status = update.status
    if update.cleaner_id:
        booking.cleaner_id = update.cleaner_id
    if update.end_time:
        booking.end_time = update.end_time
    db.commit()
    db.refresh(booking)
    return booking
from fastapi import FastAPI, Depends, HTTPException, status, Security, Body
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from fastapi.exception_handlers import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, SecurityScopes
from datetime import timedelta, datetime
from database import SessionLocal, init_db
import schemas
import models
import bleach
from datetime import timedelta
from sqlalchemy import and_, func
import os

app = FastAPI()

# JWT config
SECRET_KEY = os.getenv("SECRET_KEY", "REPLACE_THIS_WITH_A_SECURE_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

# --- AUTH ENDPOINTS ---
@app.post("/auth/signup", response_model=schemas.UserResponse)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user = models.User(
        role=user.role,
        name=user.name,
        email=user.email,
        password_hash=get_password_hash(user.password),
        phone=user.phone,
        address=user.address,
        business_name=user.business_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/auth/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": db_user.id, "role": db_user.role})
    return {"token": access_token, "user_id": db_user.id}

# For stateless JWT, logout is a no-op (client deletes token). For session-based, implement blacklist.
@app.post("/auth/logout")
def logout(token: str = Body(...)):
    # In production, implement token blacklist if needed.
    return {"success": True}
# Update booking status (admin only)
from fastapi import Body

@app.put("/admin/bookings/{booking_id}/status")
def update_booking_status(booking_id: int, status: str = Body(...), current_admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.status = status
    db.commit()
    return {"success": True, "id": booking_id, "status": status}
# List all bookings (admin only)
@app.get("/admin/bookings")
def list_bookings(current_admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    bookings = db.query(models.Booking).all()
    return [
        {
            "id": b.id,
            "user_id": b.user_id,
            "date": b.date,
            "timeslot": b.timeslot,
            "status": b.status,
            "special_instructions": getattr(b, "special_instructions", "")
        }
        for b in bookings
    ]
# List all users (admin only)
@app.get("/admin/users")
def list_users(current_admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [
        {
            "id": u.id,
            "first_name": u.first_name,
            "last_name": getattr(u, "last_name", ""),
            "email": getattr(u, "email", ""),
            "is_admin": getattr(u, "is_admin", False)
        }
        for u in users
    ]


import logging
from fastapi import FastAPI, Depends, HTTPException, status, Security
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from fastapi.exception_handlers import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, SecurityScopes
from datetime import timedelta, datetime
from database import SessionLocal, init_db
import schemas
import models
import bleach
from datetime import timedelta
from sqlalchemy import and_, func


# JWT config
SECRET_KEY = "REPLACE_THIS_WITH_A_SECURE_SECRET_KEY"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")


logging.basicConfig(level=logging.INFO)
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user_id = verify_access_token(token, credentials_exception)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None or not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def verify_access_token(token: str, credentials_exception):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return user_id
    except JWTError:
        raise credentials_exception

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user_id = verify_access_token(token, credentials_exception)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


app = FastAPI()

# Example protected admin route
@app.get("/admin/protected")
def admin_protected_route(current_admin: models.User = Depends(get_current_admin)):
    return {"message": f"Welcome, admin {current_admin.first_name}!", "is_admin": current_admin.is_admin}

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


# OAuth2-compatible token endpoint

@app.post("/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter_by(first_name=form_data.username).first()
    if not db_user or not pwd_context.verify(form_data.password, db_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": db_user.id, "is_admin": db_user.is_admin})
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": db_user.id, "first_name": db_user.first_name, "indemnity_signed": db_user.indemnity_signed, "is_admin": db_user.is_admin}}

# Legacy login endpoint for direct API use (returns JWT)

@app.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter_by(first_name=user.first_name).first()
    if not db_user or not pwd_context.verify(user.password, db_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": db_user.id, "is_admin": db_user.is_admin})
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": db_user.id, "first_name": db_user.first_name, "indemnity_signed": db_user.indemnity_signed, "is_admin": db_user.is_admin}}

# Booking Endpoints
@app.post("/book")
def create_booking(booking: schemas.BookingCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
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
        user_id=current_user.id,
        date=booking.date,
        timeslot=booking.timeslot,
        special_instructions=bleach.clean(booking.special_instructions) if booking.special_instructions else None
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return {"id": db_booking.id, "date": str(db_booking.date), "timeslot": db_booking.timeslot}

@app.get("/bookings/current")
def get_current_booking(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    today = func.current_date()
    booking = db.query(models.Booking).filter(and_(models.Booking.user_id == current_user.id, models.Booking.date >= today)).order_by(models.Booking.date.asc()).first()
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
def get_previous_bookings(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    today = func.current_date()
    bookings = db.query(models.Booking).filter(and_(models.Booking.user_id == current_user.id, models.Booking.date < today)).order_by(models.Booking.date.desc()).all()
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

@app.get("/healthz")
def health_check():
    return {"status": "ok"}
