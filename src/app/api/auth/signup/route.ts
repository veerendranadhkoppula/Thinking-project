import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: Request) {
  const body = await req.json()
  const payload = await getPayload({ config })

  try {
    // Check if user with same email or username exists
    const existingUsers = await payload.find({
      collection: 'users',
      where: {
        or: [
          { email: { equals: body.email } },
          { username: { equals: body.username } },
        ],
      },
    })

    if (existingUsers.totalDocs > 0) {
      return NextResponse.json(
        { error: 'User with this email or username already exists' },
        { status: 409 }
      )
    }

    // Create new user
    await payload.create({
      collection: 'users',
      data: {
        username: body.username,
        email: body.email,
        password: body.password,
        role: 'user',
      },
    })

    return NextResponse.json({ message: 'User created' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 })
  }
}
