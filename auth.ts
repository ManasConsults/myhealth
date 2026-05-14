import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Facebook from "next-auth/providers/facebook";
import Apple from "next-auth/providers/apple";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      role: string;
      email?: string | null;
      image?: string | null;
    };
  }
}

// Creates a new pending user for a first-time OAuth sign-in.
// Derives a unique username from the provider display name or email.
async function createOAuthUser(email: string, providerName: string | null) {
  const base = (providerName?.toLowerCase().replace(/[^a-z0-9]/g, "_") ?? email.split("@")[0]).slice(0, 20);
  let username = base;
  if (await prisma.user.findUnique({ where: { username } })) {
    username = `${base.slice(0, 16)}_${randomBytes(3).toString("hex")}`;
  }
  return prisma.user.create({
    data: { email, username, role: "user", planningMode: "guided", status: "pending" },
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const hash = createHash("sha256").update(password).digest("hex");
        const user = await prisma.user.findFirst({ where: { email } });
        if (!user || user.password !== hash) return null;
        if (user.status !== "approved") return null;

        return { id: user.id, name: user.username, role: user.role } as { id: string; name: string; role: string };
      },
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
    }),
    Apple({
      clientId: process.env.AUTH_APPLE_ID ?? "",
      clientSecret: process.env.AUTH_APPLE_SECRET ?? "",
    }),
  ],
  callbacks: {
    // Gate OAuth sign-ins: create a pending user on first attempt, block until approved.
    async signIn({ user, account }) {
      if (account?.type !== "oauth") return true;

      const email = user.email;
      if (!email) return "/register?status=no_email";

      const dbUser = await prisma.user.findFirst({ where: { email } }) ?? await createOAuthUser(email, user.name ?? null);

      if (dbUser.status === "pending") return "/register?status=pending";
      if (dbUser.status === "rejected") return "/register?status=rejected";
      return true;
    },

    async jwt({ token, user, account }) {
      if (account?.type === "oauth") {
        // Fetch our DB user by email to get our id + role (not the provider's id).
        const email = user?.email ?? (token.email as string | undefined);
        if (email) {
          const dbUser = await prisma.user.findFirst({ where: { email } });
          if (dbUser) { token.sub = dbUser.id; token.role = dbUser.role; }
        }
      } else if (user) {
        token.sub = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string) ?? "";
      }
      return session;
    },
  },
  pages: { signIn: "/" },
  session: { strategy: "jwt" },
});
