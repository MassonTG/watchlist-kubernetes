import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.media import Media
from app.schemas.media import MediaCreate, MediaUpdate, MediaOut
from app.services.auth import get_current_user
from app.worker.tasks import log_audit

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("")
def get_media(
    status: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Media).filter(Media.user_id == current_user.id)
    if status:
        query = query.filter(Media.status == status)
    if type:
        query = query.filter(Media.type == type)
    items = query.order_by(Media.created_at.desc()).all()
    return {"ok": True, "data": [MediaOut.from_orm(i) for i in items]}

@router.post("", status_code=201)
def create_media(
    data: MediaCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    item = Media(**data.model_dump(), user_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    log_audit.delay(current_user.id, "create", item.id, {"title": item.title})
    logger.info(f"Користувач {current_user.email} додав: {item.title}")
    return {"ok": True, "data": MediaOut.from_orm(item)}

@router.get("/{item_id}")
def get_one(
    item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    item = db.query(Media).filter(Media.id == item_id, Media.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Не знайдено")
    return {"ok": True, "data": MediaOut.from_orm(item)}

@router.put("/{item_id}")
def update_media(
    item_id: int,
    data: MediaUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    item = db.query(Media).filter(Media.id == item_id, Media.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Не знайдено")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    log_audit.delay(current_user.id, "update", item.id, {"title": item.title})
    logger.info(f"Користувач {current_user.email} оновив: {item.title}")
    return {"ok": True, "data": MediaOut.from_orm(item)}

@router.patch("/{item_id}/review")
def quick_review(
    item_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    item = db.query(Media).filter(Media.id == item_id, Media.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Не знайдено")
    if "user_rating" in data:
        r = data["user_rating"]
        if r is not None and not (1 <= r <= 10):
            raise HTTPException(status_code=400, detail="Рейтинг від 1 до 10")
        item.user_rating = r
    if "user_comment" in data:
        item.user_comment = data["user_comment"]
    db.commit()
    db.refresh(item)
    log_audit.delay(current_user.id, "review", item.id, {"user_rating": item.user_rating})
    return {"ok": True, "data": MediaOut.from_orm(item)}

@router.delete("/{item_id}")
def delete_media(
    item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    item = db.query(Media).filter(Media.id == item_id, Media.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Не знайдено")
    title = item.title
    db.delete(item)
    db.commit()
    log_audit.delay(current_user.id, "delete", item_id, {"title": title})
    logger.info(f"Користувач {current_user.email} видалив: {title}")
    return {"ok": True, "data": {"message": "Видалено успішно"}}