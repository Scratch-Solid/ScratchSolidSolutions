
from pydantic import BaseModel, EmailStr, constr, Field
from typing import Optional, List, Union
from datetime import date, datetime

# User Schemas
class UserBase(BaseModel):
    role: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    business_name: Optional[str] = None

class UserCreate(UserBase):
    password: constr(min_length=8, max_length=72)

class UserResponse(UserBase):
    id: int
    created_at: datetime
    deleted: bool
    soft_deleted_at: Optional[datetime]

    class Config:
        orm_mode = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Booking Schemas
class BookingBase(BaseModel):
    user_id: int
    booking_type: str
    cleaning_type: str
    payment_method: str
    loyalty_discount_applied: Optional[bool] = False
    start_time: datetime
    end_time: Optional[datetime] = None
    special_instructions: Optional[str] = None

class BookingCreate(BookingBase):
    pass

class BookingUpdate(BaseModel):
    status: Optional[str] = None
    cleaner_id: Optional[int] = None
    end_time: Optional[datetime] = None

class BookingResponse(BookingBase):
    id: int
    status: str
    cleaner_id: Optional[int] = None
    created_at: datetime

    class Config:
        orm_mode = True

# Contract Schemas
class ContractBase(BaseModel):
    business_id: int
    contract_type: str
    start_date: date
    end_date: date
    rate: float
    weekend_multiplier: Optional[float] = 1.5

class ContractCreate(ContractBase):
    pass

class ContractUpdate(BaseModel):
    rate: Optional[float] = None
    weekend_multiplier: Optional[float] = None

class ContractResponse(ContractBase):
    id: int
    immutable: bool
    created_at: datetime

    class Config:
        orm_mode = True

# Cleaner Schemas
class CleanerBase(BaseModel):
    user_id: int
    status: str
    profile_picture: Optional[str] = None
    blocked: Optional[bool] = False
    gps_lat: Optional[float] = None
    gps_long: Optional[float] = None
    current_earnings: Optional[float] = 0

class CleanerCreate(CleanerBase):
    pass

class CleanerUpdate(BaseModel):
    status: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_long: Optional[float] = None
    blocked: Optional[bool] = None
    profile_picture: Optional[str] = None

class CleanerResponse(CleanerBase):
    id: int

    class Config:
        orm_mode = True

# Payroll Schemas
class PayrollBase(BaseModel):
    cleaner_id: int
    cycle_start: date
    cycle_end: date
    base_rate: float
    weekend_rate: float
    deductions: Optional[float] = 0
    total: float

class PayrollCreate(PayrollBase):
    pass

class PayrollUpdate(BaseModel):
    deductions: Optional[float] = None
    total: Optional[float] = None

class PayrollResponse(PayrollBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

# Admin Action Schemas
class AdminActionBase(BaseModel):
    admin_id: int
    action_type: str
    target_id: int
    target_table: str
    details: Optional[str] = None

class AdminActionCreate(AdminActionBase):
    pass

class AdminActionResponse(AdminActionBase):
    id: int
    timestamp: datetime

    class Config:
        orm_mode = True

# Notification Schemas
class NotificationBase(BaseModel):
    user_id: int
    channel: str
    message: str
    status: str

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

# Content Page Schemas
class ContentPageBase(BaseModel):
    slug: str
    title: str
    body: str

class ContentPageCreate(ContentPageBase):
    pass

class ContentPageUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None

class ContentPageResponse(ContentPageBase):
    id: int
    updated_at: datetime

    class Config:
        orm_mode = True
