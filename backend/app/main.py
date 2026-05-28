"""PDS — PID Performance Assessment & Tuning System API."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .bootstrap import bootstrap_application, validate_security_defaults
from .config.settings import settings
from .health import get_dependency_health, get_liveness, get_readiness
from .migrations import run_migrations
from .routers import auth as auth_router, assessment as assessment_router, commissioning as commissioning_router, config as config_router, features as features_router, identification as identification_router, loop as loop_router, monitoring as monitoring_router, ops as ops_router, overview as overview_router, plant as plant_router, production as production_router, reports as reports_router, simulation as simulation_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_security_defaults()
    if settings.environment != "test":
        run_migrations()
    bootstrap_application()
    yield


app = FastAPI(
    title="PDS",
    version="0.1.0",
    docs_url="/api/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.cors_allow_all else settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(config_router.router)
app.include_router(config_router.groups_router)
app.include_router(reports_router.router)
app.include_router(loop_router.router)
app.include_router(commissioning_router.router)
app.include_router(features_router.router)
app.include_router(plant_router.router)
app.include_router(plant_router.device_router)
app.include_router(overview_router.router)
app.include_router(monitoring_router.router)
app.include_router(assessment_router.router)
app.include_router(production_router.router)
app.include_router(ops_router.router)
app.include_router(identification_router.router)
app.include_router(simulation_router.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": app.version, "environment": settings.environment, "runtime_data_source": settings.runtime_data_source}


@app.get("/api/health/live")
async def health_live():
    return get_liveness()


@app.get("/api/health/ready")
async def health_ready():
    return get_readiness()


@app.get("/api/health/dependencies")
async def health_dependencies():
    return get_dependency_health()
