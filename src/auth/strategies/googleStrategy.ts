import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import payload from 'payload';

export const googleAuth = new GoogleStrategy(
  {
    clientID: 'YOUR_GOOGLE_CLIENT_ID',
    clientSecret: 'YOUR_GOOGLE_CLIENT_SECRET',
    callbackURL: 'http://localhost:3000/api/users/oauth/google/callback',
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0].value;

      const existingUsers = await payload.find({
        collection: 'users',
        where: {
          email: {
            equals: email,
          },
        },
      });

      let user = existingUsers.docs[0];

      if (!user) {
        if (!email) {
          throw new Error('Email not found in Google profile');
        }
        user = await payload.create({
          collection: 'users',
          data: {
            email: email,
            role: 'user',
          },
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }
);
