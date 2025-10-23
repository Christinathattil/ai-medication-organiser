import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
  : null;

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8080/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract user info from Google profile
      const googleUser = {
        google_id: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        picture: profile.photos[0]?.value || null,
        last_login: new Date().toISOString()
      };

      if (supabase) {
        // Check if user exists in database
        let { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('google_id', googleUser.google_id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          // Error other than "not found"
          console.error('Error fetching user:', fetchError);
          return done(fetchError, null);
        }

        if (existingUser) {
          // Update last login (non-critical - don't fail auth if this fails)
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ last_login: googleUser.last_login })
            .eq('id', existingUser.id)
            .select()
            .maybeSingle();

          if (updateError) {
            console.warn('⚠️  Could not update last_login (non-critical):', updateError.message);
            // Continue with existing user data - don't fail authentication
            return done(null, existingUser);
          }

          // Return updated user if update succeeded, otherwise existing user
          return done(null, updatedUser || existingUser);
        } else {
          // Create new user
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([googleUser])
            .select()
            .single();

          if (insertError) {
            console.error('Error creating user:', insertError);
            return done(insertError, null);
          }

          console.log('✅ New user created:', newUser.email);
          return done(null, newUser);
        }
      } else {
        // If no Supabase, use in-memory (for testing)
        console.warn('⚠️  No Supabase - using session-only auth');
        return done(null, googleUser);
      }
    } catch (error) {
      console.error('❌ Auth error:', error);
      return done(error, null);
    }
  }
));

// Serialize user for session
passport.serializeUser((user, done) => {
  // Always serialize the numeric ID (primary key)
  console.log('🔐 Serializing user:', user.id);
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    if (supabase) {
      // Use service role to bypass RLS during deserialization
      // This is safe because the user ID comes from a signed session
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

      if (error) {
        console.error('Error deserializing user:', error);
        // Don't fail completely - log out the user instead
        return done(null, false);
      }

      if (!user) {
        console.warn('⚠️ User not found in database during deserialization, ID:', id);
        // User was deleted or doesn't exist - force re-login
        return done(null, false);
      }

      console.log('✅ User deserialized:', user.email);
      console.log('   Phone verified:', user.phone_verified);
      console.log('   Phone:', user.phone);
      done(null, user);
    } else {
      // Session-only mode
      done(null, { google_id: id });
    }
  } catch (error) {
    console.error('❌ Deserialization error:', error);
    // Don't crash - return false to force re-login
    done(null, false);
  }
});

// Middleware to check if user is authenticated
export function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated. Please login.' });
}

// Middleware to check auth for HTML pages
export function ensureAuthenticatedHTML(req, res, next) {
  try {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login');
  } catch (error) {
    console.error('❌ Auth check error:', error);
    // If authentication check fails, redirect to login
    res.redirect('/login');
  }
}

export default passport;
