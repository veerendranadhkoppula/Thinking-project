// app/api/user/update-password/route.ts
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";

export async function POST(req: Request) {
  const { currentPassword, newPassword } = await req.json();
  const payload = await getPayload({ config });

  try {
    const { user } = await payload.auth({ headers: req.headers });
    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    // Re-authenticate user
    const login = await payload.login({
      collection: "users",
      data: { email: user.email, password: currentPassword },
    });

    if (!login?.token) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    // Update password
    await payload.update({
      collection: "users",
      id: user.id,
      data: { password: newPassword },
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Password update failed" }, { status: 500 });
  }
}
