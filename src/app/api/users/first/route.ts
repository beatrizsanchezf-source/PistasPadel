import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { name: true },
  });

  return NextResponse.json(user);
}
