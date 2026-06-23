from aiogram import Router
from .support import router as support_router
from .admin_panel_trigger import router as admin_trigger_router

all_routers = [
    support_router,
    admin_trigger_router
]
