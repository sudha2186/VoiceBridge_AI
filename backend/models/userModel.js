/**
 * User model — PLACEHOLDER.
 *
 * In this foundation phase, user data lives in Supabase `auth.users` and
 * the `profiles` table. This module will hold data-access helpers for
 * user/profile queries once the backend controllers are implemented.
 */

export const UserModel = {
  findById: async (_id) => {
    throw new Error('UserModel.findById — not implemented (use Supabase profiles table).');
  },
  findByEmail: async (_email) => {
    throw new Error('UserModel.findByEmail — not implemented (use Supabase auth.users).');
  },
};
