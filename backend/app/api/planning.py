from fastapi import APIRouter

from ..models import database
from ..schemas.base import Slot

router = APIRouter()


@router.get('/slots', response_model=list[Slot])
def list_slots() -> list[Slot]:
    return [Slot.model_validate(slot) for slot in database.slots]
