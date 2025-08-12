// app/api/user/me/route.ts
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";

export async function GET(req: Request) {
  const payload = await getPayload({ config });

  try {
    const { user } = await payload.auth({
      headers: req.headers
    });
    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    return NextResponse.json({
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
