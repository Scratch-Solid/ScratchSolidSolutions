from pydantic import BaseModel, EmailStr, constr
from typing import Optional
from datetime import date

class UserCreate(BaseModel):
    first_name: str
    last_name: str
    address: str
    cellphone: str
    whatsapp: str
    email: Optional[EmailStr] = None
    password: constr(min_length=8, max_length=72)

class UserLogin(BaseModel):
    first_name: str
    password: str

class BookingCreate(BaseModel):
    user_id: int
    date: date
    timeslot: str
    special_instructions: Optional[str] = None

class ReviewCreate(BaseModel):
    booking_id: int
    comment: Optional[str] = None
    rating: Optional[int] = None
