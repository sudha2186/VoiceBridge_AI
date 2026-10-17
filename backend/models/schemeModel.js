/**
 * Scheme model — PLACEHOLDER.
 *
 * Will hold data-access helpers for the `schemes` catalog table.
 * Read operations are currently handled directly by the frontend Supabase
 * client via RLS; this model will be used by future backend controllers.
 */

export const SchemeModel = {
  findAll: async () => {
    throw new Error('SchemeModel.findAll — not implemented yet.');
  },
  findById: async (_id) => {
    throw new Error('SchemeModel.findById — not implemented yet.');
  },
};
