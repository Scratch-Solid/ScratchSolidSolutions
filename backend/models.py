from sqlalchemy import Column, Integer, String, Date, Time, Boolean, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    cellphone = Column(String, nullable=False)
    whatsapp = Column(String, nullable=False)
    email = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    indemnity_signed = Column(Boolean, default=False)
    bookings = relationship('Booking', back_populates='user')
    reviews = relationship('Review', back_populates='user')

class Booking(Base):
    __tablename__ = 'bookings'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    date = Column(Date, nullable=False)
    timeslot = Column(String, nullable=False)  # e.g., 'morning' or 'afternoon'
    special_instructions = Column(Text, nullable=True)
    status = Column(String, default='booked')  # booked, on the way, arrived, completed
    user = relationship('User', back_populates='bookings')
    review = relationship('Review', back_populates='booking', uselist=False)

class Review(Base):
    __tablename__ = 'reviews'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    booking_id = Column(Integer, ForeignKey('bookings.id'))
    comment = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)
    user = relationship('User', back_populates='reviews')
    booking = relationship('Booking', back_populates='review')
