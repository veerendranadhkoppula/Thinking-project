// app/(frontend)/page.tsx
import Navbar from './Home/Navbar/Navbar';
import { cookies } from 'next/headers';
import db from './lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const cookieStore = await cookies();
  const email = cookieStore.get('email')?.value || '';

  let user: { email: string; username: string } | null = null;

  if (email) {
    const result = await db.query(
      `SELECT email, username
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email]
    );
    user = result.rows[0] || null;
  }

  return (
    <>
      <Navbar user={user} />
      {/* rest of your homepage */}
    </>
  );
}
