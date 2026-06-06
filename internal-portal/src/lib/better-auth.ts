// Stub for better-auth to satisfy TypeScript imports
// TODO: Replace with actual better-auth implementation when ready

export const auth = {
  api: {
    getSession: async ({ headers }: { headers: Headers }): Promise<{ user?: { id: string; email?: string; name?: string } } | null> => {
      // Placeholder: reads a session cookie/token and returns user or null
      return null;
    },
  },
};
