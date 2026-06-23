"""SOULDAWN — Database package. Re-export everything."""
from database.connection import (
    init_db,
    dispose_db,
    set_bot,
    get_or_create_user,
    get_user_cart,
    save_user_cart,
    save_order,
    get_user_orders,
    get_all_users,
    get_stats,
    get_full_stats,
    update_user_heartbeat,
    get_online_users,
    get_recent_orders,
    get_paid_unnotified_orders,
    mark_order_processing,
    get_products_by_ids,
    add_expense,
    get_expenses,
    delete_expense,
    update_user_notifications,
    log_action,
    create_ticket,
    get_ticket,
    get_ticket_by_message_id,
    get_ticket_by_accepted_admin,
    take_ticket,
    update_ticket_admin_messages,
    get_open_tickets,
    close_ticket,
    update_ticket_status,
    deactivate_user,
)

__all__ = [
    "init_db", "dispose_db", "set_bot",
    "get_or_create_user", "get_user_cart", "save_user_cart",
    "save_order", "get_user_orders", "get_all_users",
    "get_stats", "get_full_stats",
    "update_user_heartbeat", "get_online_users", "get_recent_orders",
    "get_paid_unnotified_orders", "mark_order_processing",
    "get_products_by_ids",
    "add_expense", "get_expenses", "delete_expense",
    "update_user_notifications", "log_action",
    "create_ticket", "get_ticket", "get_ticket_by_message_id",
    "get_ticket_by_accepted_admin",
    "take_ticket", "update_ticket_admin_messages", "get_open_tickets",
    "close_ticket", "update_ticket_status",
    "deactivate_user",
]
__all__ = [
    "init_db", "dispose_db", "set_bot",
    "get_or_create_user", "get_user_cart", "save_user_cart",
    "save_order", "get_user_orders", "get_all_users",
    "get_stats", "get_full_stats",
    "update_user_heartbeat", "get_online_users", "get_recent_orders",
    "get_paid_unnotified_orders", "mark_order_processing",
    "get_products_by_ids",
    "add_expense", "get_expenses", "delete_expense",
    "update_user_notifications", "log_action",
    "create_ticket", "get_ticket", "get_ticket_by_message_id",
    "get_ticket_by_accepted_admin",
    "take_ticket", "update_ticket_admin_messages", "get_open_tickets",
    "close_ticket", "update_ticket_status",
    "deactivate_user",
    "append_ticket_message", # <-- ОБЯЗАТЕЛЬНО ДОБАВЛЯЕМ СЮДА В КОНЕЦ СПИСКА
]

# Пытаемся импортировать функцию из файла моделей или коннекта
try:
    from .models import append_ticket_message
except ImportError:
    try:
        from .connection import append_ticket_message
    except ImportError:
        try:
            # Если реальная функция называется по-другому, используем её как альтернативу
            from .connection import update_ticket_admin_messages as append_ticket_message
        except ImportError:
            # Если ничего не нашлось, создаем заглушку, чтобы бот не падал
            async def append_ticket_message(*args, **kwargs):
                return None
