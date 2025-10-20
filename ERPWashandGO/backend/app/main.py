from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth, clients, services, engagements, planning, stats

app = FastAPI(title="ERP Codex API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(clients.router, prefix="/clients", tags=["clients"])
app.include_router(services.router, prefix="/services", tags=["services"])
app.include_router(engagements.router, prefix="/prestations", tags=["prestations"])
app.include_router(planning.router, prefix="/planning", tags=["planning"])
app.include_router(stats.router, prefix="/stats", tags=["stats"])


@app.get("/health")
def health() -> dict[str, str]:
    """Simple healthcheck endpoint."""
    return {"status": "ok"}
