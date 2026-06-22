"""SOULDAWN Support Bot — Handlers package."""
from handlers.support import router as support_router
from handlers.admin  import router as admin_router

all_routers = [support_router, admin_router]
