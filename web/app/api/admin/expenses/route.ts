import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const expenses = await prisma.expense.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(
    expenses.map((e) => ({
      id: String(e.id),
      category: e.category,
      description: e.description,
      amount: e.amount,
      created_at: e.createdAt ? new Date(e.createdAt).toISOString() : null,
    }))
  );
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const { category, description, amount } = body as {
    category?: string;
    description?: string;
    amount?: number;
  };
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "amount обязателен" }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      category: category || "other",
      description: description || "",
      amount: Math.round(amount),
    },
  });
  return NextResponse.json({
    id: String(expense.id),
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    created_at: expense.createdAt ? new Date(expense.createdAt).toISOString() : null,
  });
}
