import { NextResponse } from "next/server";

import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk's middleware is only engaged when the app is actually configured with
// keys. With no keys (anonymous-first / local dev), we pass requests straight
// through so nothing about the public shelf depends on auth being set up.
const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default hasClerk ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|pdf)).*)",
    "/(api|trpc)(.*)",
  ],
};
