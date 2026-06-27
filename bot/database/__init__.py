"""SOULDAWN — database package public API."""
from database.connection import (
    init_db,
    dispose_db,
    get_session,
    set_bot,
    # User
    get_or_create_user,
    get_all_users,
    deactivate_user,
    update_user_heartbeat,
    get_online_users,
    update_user_notifications,
    # Cart
    get_user_cart,
    save_user_cart,
    # Orders
    save_order,
    get_user_orders,
    get_recent_orders,
    get_paid_unnotified_orders,
    mark_order_processing,
    # Stats
    get_stats,
    get_full_stats,
    # Expenses
    add_expense,
    get_expenses,
    delete_expense,
    # Action logs
    log_action,
    # Support tickets
    create_ticket,
    get_ticket,
    take_ticket,
    get_ticket_by_message_id,
    update_ticket_admin_messages,
    close_ticket,
    get_ticket_by_accepted_admin,
    get_open_tickets,
    update_ticket_status,
    append_ticket_message,
    get_open_ticket_by_user,
    save_broadcast,
)

__all__ = [
    "init_db", "dispose_db", "get_session", "set_bot",
    "get_or_create_user", "get_all_users", "deactivate_user",
    "update_user_heartbeat", "get_online_users", "update_user_notifications",
    "get_user_cart", "save_user_cart",
    "save_order", "get_user_orders", "get_recent_orders",
    "get_paid_unnotified_orders", "mark_order_processing",
    "get_stats", "get_full_stats",
    "add_expense", "get_expenses", "delete_expense",
    "log_action",
    "create_ticket", "get_ticket", "take_ticket",
    "get_ticket_by_message_id", "update_ticket_admin_messages",
    "close_ticket", "get_ticket_by_accepted_admin", "get_open_tickets",
    "update_ticket_status", "append_ticket_message",
    "get_open_ticket_by_user", "save_broadcast",
]
