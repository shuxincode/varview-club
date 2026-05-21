from redis.asyncio import Redis as AsyncRedis


class AppState:
    redis: AsyncRedis | None = None


state = AppState()
