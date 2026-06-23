import re

with open("handlers/payments.py", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Заменяем импорт
code = code.replace("SUPPORT_CHAT_ID,", "SUPPORT_CHAT_IDS,")

# 2. Заменяем блок в poll_paid_orders (строка ~69)
old_block1 = """            if SUPPORT_CHAT_ID:
                lines = []
                for i, it in enumerate(items, 1):
                    nm = it.get("name", it.get("id", "?"))
                    qty = it.get("qty", 1)
                    lines.append(f"{i}. {nm} x{qty}")
                try:
                    await bot.send_message(
                        SUPPORT_CHAT_ID,
                        f"SOULDAWN · Оплаченный заказ #{order_id[:8]}\\n\\n"
                        + "\\n".join(lines)
                        + f"\\n\\nСумма: {_fmt_price(total)}\\n"
                        f"Telephone: {contact.get('phone', '—')}\\n"
                        f"Name: {contact.get('name', '—')}",
                    )
                except Exception as e:
                    logger.error(f"poll_paid_orders: operator notify failed: {e}")"""

if old_block1 not in code:
    # На случай если в f-строке русские слова "Телефон" и "Имя"
    old_block1 = old_block1.replace("Telephone:", "Телефон:").replace("Name:", "Имя:")

new_block1 = """            if SUPPORT_CHAT_IDS:
                lines = []
                for i, it in enumerate(items, 1):
                    nm = it.get("name", it.get("id", "?"))
                    qty = it.get("qty", 1)
                    lines.append(f"{i}. {nm} x{qty}")
                for op_id in SUPPORT_CHAT_IDS:
                    try:
                        await bot.send_message(
                            op_id,
                            f"SOULDAWN · Оплаченный заказ #{order_id[:8]}\\n\\n"
                            + "\\n".join(lines)
                            + f"\\n\\nСумма: {_fmt_price(total)}\\n"
                            f"Телефон: {contact.get('phone', '—')}\\n"
                            f"Имя: {contact.get('name', '—')}",
                        )
                    except Exception as e:
                        logger.error(f"poll_paid_orders: operator notify failed for {op_id}: {e}")"""

code = code.replace(old_block1, new_block1)

# 3. Универсальный патч для остальных простых мест отправки (192, 361, 401)
def replace_simple_notify(match):
    indent = match.group(1)
    message_content = match.group(2)
    new_text = f"{indent}if SUPPORT_CHAT_IDS:\n"
    new_text += f"{indent}    for op_id in SUPPORT_CHAT_IDS:\n"
    new_text += f"{indent}        try:\n"
    new_text += f"{indent}            await bot.send_message(\n"
    new_text += f"{indent}                op_id,\n"
    new_text += f"{indent}                {message_content}\n"
    new_text += f"{indent}            )\n"
    new_text += f"{indent}        except Exception:\n"
    new_text += f"{indent}            pass"
    return new_text

pattern = r"([ \t]*)if SUPPORT_CHAT_ID:\n[ \t]*try:\n[ \t]*await bot\.send_message\(\n[ \t]*SUPPORT_CHAT_ID,\n[ \t]*(.*?)\n[ \t]*\)\n[ \t]*except Exception:\n[ \t]*pass"
code = re.sub(pattern, replace_simple_notify, code, flags=re.DOTALL)

with open("handlers/payments.py", "w", encoding="utf-8") as f:
    f.write(code)

print("Файл handlers/payments.py успешно обновлен!")
