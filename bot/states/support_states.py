"""SOULDAWN — FSM states for support, broadcast, and admin flows."""
from aiogram.fsm.state import State, StatesGroup


class OperatorState(StatesGroup):
    waiting_message = State()
    confirm_send = State()


class AIState(StatesGroup):
    waiting_question = State()
    waiting_choice = State()


class SupportStates(StatesGroup):
    waiting_for_message = State()


class BroadcastStates(StatesGroup):
    waiting_for_content = State()
