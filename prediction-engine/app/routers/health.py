from fastapi import APIRouter

from app.state import state
from app.memory.manager import manager as memory_manager

router = APIRouter()


@router.get("/health")
async def health():
    redis_ok = False
    if state.redis:
        try:
            await state.redis.ping()
            redis_ok = True
        except Exception:
            pass

    return {
        "status": "ok" if redis_ok else "degraded",
        "redis": redis_ok,
        "memory": {
            "l1_redisvl": redis_ok,
            "l2_mem0": memory_manager.l2._memory is not None,
            "l3_duckdb": memory_manager.l3._conn is not None,
        },
    }
