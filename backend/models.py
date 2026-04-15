
from sqlalchemy import Column, Integer, String, Date, DateTime, Time, Boolean, ForeignKey, Text, Numeric, CheckConstraint, DECIMAL
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, autoincrement=True)
    role = Column(String(20), CheckConstraint("role IN ('individual','business','cleaner','admin')"))
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    phone = Column(String(20))
    address = Column(Text)
    business_name = Column(String(150))
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted = Column(Boolean, default=False)
    soft_deleted_at = Column(DateTime)
    bookings = relationship('Booking', back_populates='user', foreign_keys='Booking.user_id')
    cleaner_profile = relationship('Cleaner', back_populates='user', uselist=False)

class Booking(Base):
    __tablename__ = 'bookings'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    cleaner_id = Column(Integer, ForeignKey('users.id'))
    booking_type = Column(String(20), CheckConstraint("booking_type IN ('once_off','recurring','contract')"))
    cleaning_type = Column(String(50))
    payment_method = Column(String(10), CheckConstraint("payment_method IN ('cash','eft')"))
    loyalty_discount_applied = Column(Boolean, default=False)
    status = Column(String(20), CheckConstraint("status IN ('pending','confirmed','completed','cancelled')"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship('User', back_populates='bookings', foreign_keys=[user_id])

class Contract(Base):
    __tablename__ = 'contracts'
    id = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    contract_type = Column(String(10), CheckConstraint("contract_type IN ('1_year','5_year')"))
    start_date = Column(Date)
    end_date = Column(Date)
    rate = Column(Numeric(10,2), nullable=False)
    weekend_multiplier = Column(Numeric(4,2), default=1.5)
    immutable = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Cleaner(Base):
    __tablename__ = 'cleaners'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    status = Column(String(20), CheckConstraint("status IN ('idle','on_the_way','arrived','completed')"))
    profile_picture = Column(Text)
    blocked = Column(Boolean, default=False)
    gps_lat = Column(DECIMAL(9,6))
    gps_long = Column(DECIMAL(9,6))
    current_earnings = Column(Numeric(10,2), default=0)
    user = relationship('User', back_populates='cleaner_profile')

class Payroll(Base):
    __tablename__ = 'payroll'
    id = Column(Integer, primary_key=True, autoincrement=True)
    cleaner_id = Column(Integer, ForeignKey('cleaners.id', ondelete='CASCADE'))
    cycle_start = Column(Date)
    cycle_end = Column(Date)
    base_rate = Column(Numeric(10,2))
    weekend_rate = Column(Numeric(10,2))
    deductions = Column(Numeric(10,2), default=0)
    total = Column(Numeric(10,2))
    created_at = Column(DateTime, default=datetime.utcnow)

class AdminAction(Base):
    __tablename__ = 'admin_actions'
    id = Column(Integer, primary_key=True, autoincrement=True)
    admin_id = Column(Integer, ForeignKey('users.id'))
    action_type = Column(String(50))
    target_id = Column(Integer)
    target_table = Column(String(50))
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(Text)  # JSONB in Postgres, TEXT in SQLite

class Notification(Base):
    __tablename__ = 'notifications'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    channel = Column(String(20), CheckConstraint("channel IN ('whatsapp','email')"))
    message = Column(Text)
    status = Column(String(20), CheckConstraint("status IN ('pending','sent','failed')"))
    created_at = Column(DateTime, default=datetime.utcnow)

class ContentPage(Base):
    __tablename__ = 'content_pages'
    id = Column(Integer, primary_key=True, autoincrement=True)
    slug = Column(String(50), unique=True)
    title = Column(String(100))
    body = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow)
