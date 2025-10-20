/**
 * User Context Middleware for Row Level Security (RLS)
 * Sets the current user ID in Supabase session for RLS policies
 */

/**
 * Middleware to set user context for authenticated requests
 * This ensures RLS policies work correctly
 */
export async function setUserContext(req, res, next) {
  if (req.isAuthenticated() && req.user && req.user.id) {
    // Set user context in request for later use
    req.userId = req.user.id;
  }
  next();
}

/**
 * Execute a Supabase query with user context for RLS
 * @param {object} supabase - Supabase client
 * @param {number} userId - User ID
 * @param {function} queryFn - Async function that performs the query
 */
export async function withUserContext(supabase, userId, queryFn) {
  if (!supabase || !userId) {
    throw new Error('Supabase client and userId required');
  }

  try {
    // Set user context in Supabase session
    await supabase.rpc('set_current_user_id', { p_user_id: userId });
    
    // Execute the query
    const result = await queryFn();
    
    return result;
  } catch (error) {
    console.error('Error executing query with user context:', error);
    throw error;
  }
}

/**
 * Middleware to ensure all database operations include user context
 */
export function requireUserContext(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: 'User context required' });
  }
  next();
}

export default {
  setUserContext,
  withUserContext,
  requireUserContext
};
