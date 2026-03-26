from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

class MediaCreate(BaseModel):
    title: str
    type: str
    status: str = "to_watch"
    genre: Optional[str] = None
    year: Optional[int] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    poster_url: Optional[str] = None
    user_rating: Optional[int] = None
    user_comment: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Назва не може бути порожньою")
        return v.strip()

    @field_validator("type")
    @classmethod
    def valid_type(cls, v):
        if v not in ("film", "series"):
            raise ValueError("Тип має бути film або series")
        return v

    @field_validator("status")
    @classmethod
    def valid_status(cls, v):
        if v not in ("to_watch", "watched"):
            raise ValueError("Статус має бути to_watch або watched")
        return v

    @field_validator("rating")
    @classmethod
    def valid_rating(cls, v):
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Рейтинг має бути від 1 до 10")
        return v

    @field_validator("user_rating")
    @classmethod
    def valid_user_rating(cls, v):
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Рейтинг має бути від 1 до 10")
        return v

    @field_validator("year")
    @classmethod
    def valid_year(cls, v):
        if v is not None and not (1888 <= v <= 2030):
            raise ValueError("Некоректний рік")
        return v

class MediaUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    genre: Optional[str] = None
    year: Optional[int] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    poster_url: Optional[str] = None
    user_rating: Optional[int] = None
    user_comment: Optional[str] = None

class MediaOut(BaseModel):
    id: int
    user_id: int
    title: str
    type: str
    status: str
    genre: Optional[str]
    year: Optional[int]
    rating: Optional[int]
    notes: Optional[str]
    poster_url: Optional[str]
    user_rating: Optional[int]
    user_comment: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True