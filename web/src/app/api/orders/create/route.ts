import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOrderCipher } from "@/lib/orderCipher";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      phone,
      email,
      telegram,
      city,
      address,
      comment,
      delivery,
      pvzCode,
      pvzAddress,
      items,
      totalPrice,
      deliveryCost,
      discount,
      promoCode,
    } = body;

    // Validate required fields: email + telegram
    if (!email || !telegram) {
      return NextResponse.json(
        { error: "Email и Telegram @username обязательны" },
        { status: 400 }
      );
    }

    if (!items || !items.length) {
      return NextResponse.json({ error: "Корзина пуста" }, { status: 400 });
    }

    // Validate PVZ selection for cdek-pvz delivery
    if (delivery === "cdek-pvz" && !pvzAddress) {
      return NextResponse.json(
        { error: "Выберите пункт выдачи СДЭК" },
        { status: 400 }
      );
    }

    // Validate city for courier/post
    if (delivery !== "cdek-pvz" && !city) {
      return NextResponse.json(
        { error: "Укажите город доставки" },
        { status: 400 }
      );
    }

    // Generate unique cipher
    let cipher = generateOrderCipher();
    let attempts = 0;
    while (await db.order.findUnique({ where: { cipher } })) {
      cipher = generateOrderCipher();
      attempts++;
      if (attempts > 10) {
        cipher = `SD-${Date.now().toString(36).toUpperCase().slice(-4)}-${Math.random().toString(36).toUpperCase().slice(2, 6)}`;
        break;
      }
    }

    const itemsJson = JSON.stringify(items);
    const itemNames = items.map((i: { name: string; size: string }) => `${i.name} (${i.size})`).join(", ");

    // Check if user is authenticated (cookie-based)
    const auth = await getAuthUser(req as any).catch(() => null);

    // Save order to database
    const order = await db.order.create({
      data: {
        cipher,
        userId: auth?.userId || undefined,
        userEmail: email,
        userTelegram: telegram,
        userName: name || "",
        userPhone: phone || "",
        items: itemsJson,
        itemNames,
        itemsCount: items.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0),
        subtotal: totalPrice - (deliveryCost || 0),
        deliveryCost: deliveryCost || 0,
        discountAmount: discount || 0,
        promoCode: promoCode || "",
        total: totalPrice || 0,
        deliveryType: delivery || "cdek-pvz",
        deliveryCity: city || "",
        deliveryAddress: address || "",
        pvzCode: pvzCode || "",
        pvzAddress: pvzAddress || "",
        comment: comment || "",
        status: "pending",
      },
    });

    // Send Telegram notification to admin (fire-and-forget)
    try {
      const adminNotifyUrl = process.env.ADMIN_TELEGRAM_NOTIFY_URL;
      if (adminNotifyUrl) {
        const text = [
          `🛒 *НОВЫЙ ЗАКАЗ* #${cipher}`,
          ``,
          `👤 ${name || "Не указано"}`,
          `📧 ${email}`,
          `📱 Telegram: ${telegram}`,
          `${phone ? `📞 ${phone}` : ""}`,
          ``,
          `📦 ${itemNames}`,
          `🏷 Товаров: ${order.itemsCount}`,
          `💰 Итого: ${(order.total || 0).toLocaleString("ru-RU")} ₽`,
          delivery ? `🚚 ${delivery === "cdek-pvz" ? "ПВЗ СДЭК" : delivery === "cdek-courier" ? "Курьер СДЭК" : "Почта России"}` : "",
          `${deliveryCost ? `💸 Доставка: ${deliveryCost} ₽` : ""}`,
          `${city ? `📍 ${city}` : ""}`,
          `${pvzAddress || address ? `    ${pvzAddress || address}` : ""}`,
          `${comment ? `💬 ${comment}` : ""}`,
        ].filter(Boolean).join("\n");

        fetch(adminNotifyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, parse_mode: "Markdown" }),
        }).catch(() => {});
      }
    } catch {
      // Non-critical, don't block order creation
    }

    console.log("New order:", cipher, {
      email,
      telegram,
      items: items.length,
      total: order.total,
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderCipher: cipher,
      message: "Заказ оформлен",
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}