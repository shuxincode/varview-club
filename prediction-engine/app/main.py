from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.routers import health, predict, search
from app.state import state
from app.config import settings
from app.memory.manager import manager as memory_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── L0: Redis connection ──
    try:
        from redis.asyncio import from_url
        client = from_url(settings.redis_url, decode_responses=True)
        await client.ping()
        state.redis = client
        print(f"[engine] Redis connected: {settings.redis_url}")
    except Exception as e:
        print(f"[engine] Redis unavailable ({e}) — running without cache")
        state.redis = None

    # ── L1–L3: Tiered memory layer ──
    memory_manager.redis = state.redis
    await memory_manager.initialize()

    yield

    if state.redis:
        await state.redis.aclose()
    await memory_manager.close()


app = FastAPI(
    title="VARview Prediction Engine",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(predict.router)
app.include_router(search.router)
