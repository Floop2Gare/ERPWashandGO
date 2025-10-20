from fastapi import APIRouter, HTTPException

from ..schemas.base import AuthPayload, LoginRequest

router = APIRouter()


@router.post('/login', response_model=AuthPayload)
def login(payload: LoginRequest) -> AuthPayload:
    if payload.email != 'admin@atelier-proprete.fr' or payload.password != 'admin':
        raise HTTPException(status_code=401, detail='Identifiants invalides')
    return AuthPayload(access_token='fake-token')


@router.get('/me', response_model=dict[str, str])
def me() -> dict[str, str]:
    return {
        'id': 'user-1',
        'name': 'Marion Lefèvre',
        'email': 'admin@atelier-proprete.fr',
        'role': 'Administratrice',
    }
