export interface SessionData {
  userId?: string;
}

export const SESSION_OPTIONS = {
  cookieName: "tg-session",
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};
