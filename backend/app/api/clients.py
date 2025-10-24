from fastapi import APIRouter, HTTPException

from ..models import database
from ..schemas.base import Client, ClientCreate

router = APIRouter()


@router.get('/', response_model=list[Client])
def list_clients(search: str | None = None, city: str | None = None, status: str | None = None) -> list[Client]:
    results = database.clients
    if search:
        results = [client for client in results if search.lower() in client.name.lower()]
    if city:
        results = [client for client in results if client.city == city]
    if status:
        results = [client for client in results if client.status == status]
    return [Client.model_validate(client) for client in results]


@router.post('/', response_model=Client, status_code=201)
def create_client(payload: ClientCreate) -> Client:
    identifier = f"c{len(database.clients) + 1}"
    client = database.Client(
        id=identifier,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        city=payload.city,
        status=payload.status,
        tags=payload.tags,
        last_service=database.clients[0].last_service,
    )
    database.clients.append(client)
    return Client.model_validate(client)


@router.get('/{client_id}', response_model=Client)
def get_client(client_id: str) -> Client:
    client = next((client for client in database.clients if client.id == client_id), None)
    if not client:
        raise HTTPException(status_code=404, detail='Client introuvable')
    return Client.model_validate(client)


@router.put('/{client_id}', response_model=Client)
def update_client(client_id: str, payload: ClientCreate) -> Client:
    client = next((client for client in database.clients if client.id == client_id), None)
    if not client:
        raise HTTPException(status_code=404, detail='Client introuvable')
    client.name = payload.name
    client.email = payload.email
    client.phone = payload.phone
    client.city = payload.city
    client.status = payload.status
    client.tags = payload.tags
    return Client.model_validate(client)


@router.delete('/{client_id}', status_code=204)
def delete_client(client_id: str) -> None:
    index = next((index for index, client in enumerate(database.clients) if client.id == client_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail='Client introuvable')
    database.clients.pop(index)
