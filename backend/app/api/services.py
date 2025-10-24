from fastapi import APIRouter, HTTPException

from ..models import database
from ..schemas.base import Service

router = APIRouter()


@router.get('/', response_model=list[Service])
def list_services(active: bool | None = None, category: str | None = None) -> list[Service]:
    items = database.services
    if active is not None:
        items = [service for service in items if service.active == active]
    if category:
        items = [service for service in items if service.category == category]
    return [Service.model_validate(service) for service in items]


@router.get('/{service_id}', response_model=Service)
def get_service(service_id: str) -> Service:
    service = next((service for service in database.services if service.id == service_id), None)
    if not service:
        raise HTTPException(status_code=404, detail='Service introuvable')
    return Service.model_validate(service)
