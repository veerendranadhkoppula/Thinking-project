// app/(frontend)/page.tsx
import Navbar from './Home/Navbar/Navbar';
import DashBoard from './Home/DashBoard/DashBoard';
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
  const dummyData = [
  { id: 1, title: "Project Dashboard", category: "work" },
  { id: 2, title: "Shopping List", category: "personal" },
  { id: 3, title: "Meeting Notes", category: "work" },
  { id: 4, title: "Travel Plans", category: "personal" },
  { id: 5, title: "Ideas", category: "other" },
];

  return (
    <>
      <Navbar user={user} />
      <DashBoard data={dummyData}/>
    </>
  );
}
