import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { query } from "@/lib/db";
import crypto from "crypto";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.name) {
          return null;
        }
        const email = credentials.email;
        const name = credentials.name;

        // Query the users table via raw SQL to check if the user exists
        const res = await query("SELECT * FROM users WHERE email = $1", [email]);
        let user = res.rows[0];

        if (!user) {
          // If not, insert them via raw SQL
          const id = crypto.randomUUID();
          const insertRes = await query(
            "INSERT INTO users (id, email, name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *",
            [id, email, name]
          );
          user = insertRes.rows[0];
        } else {
          user.name = name;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false;

      const res = await query("SELECT * FROM users WHERE email = $1", [user.email]);
      const existingUser = res.rows[0];
      const name = user.name || user.email.split("@")[0];
      const image = user.image || null;

      if (!existingUser) {
        const id = user.id || crypto.randomUUID();
        await query(
          "INSERT INTO users (id, email, name, image, created_at) VALUES ($1, $2, $3, $4, NOW())",
          [id, user.email, name, image]
        );
      } else {
        await query(
          "UPDATE users SET name = $1, image = $2 WHERE email = $3",
          [name, image, user.email]
        );
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
