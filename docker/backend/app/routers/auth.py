import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin
from app.services.auth import hash_password, verify_password, create_access_token

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/register", status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email вже використовується")
    user = User(email=data.email, password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"Новий користувач: {user.email}")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"ok": True, "data": {"access_token": token, "token_type": "bearer",
            "user": {"id": user.id, "email": user.email, "role": user.role}}}

@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Невірний email або пароль")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    logger.info(f"Користувач увійшов: {user.email}")
    return {"ok": True, "data": {"access_token": token, "token_type": "bearer",
            "user": {"id": user.id, "email": user.email, "role": user.role}}}