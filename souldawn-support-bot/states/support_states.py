"""SOULDAWN Support Bot — FSM states."""
from aiogram.fsm.state import State, StatesGroup


class NewTicketStates(StatesGroup):
    choosing_category = State()
    waiting_message   = State()
    confirm           = State()
