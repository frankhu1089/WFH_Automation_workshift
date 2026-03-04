import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    error?: string;
  }
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "refresh_token failed");
  return {
    accessToken: data.access_token as string,
    expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in as number),
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    jwt({ token, account }) {
      // Initial sign-in: store tokens + expiry
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at; // seconds since epoch
        return token;
      }

      // Token still valid (with 60s buffer)
      if (Date.now() < ((token.expiresAt as number) ?? 0) * 1000 - 60_000) {
        return token;
      }

      // Token expired — refresh it
      if (!token.refreshToken) {
        return { ...token, error: "no_refresh_token" };
      }
      return refreshAccessToken(token.refreshToken as string)
        .then(({ accessToken, expiresAt }) => ({
          ...token,
          accessToken,
          expiresAt,
          error: undefined,
        }))
        .catch(() => ({ ...token, error: "refresh_failed" }));
    },
    session({ session, token }) {
      session.accessToken = (token.accessToken as string | undefined) ?? "";
      if (token.error) session.error = token.error as string;
      return session;
    },
  },
});
