"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";

// Inner control: always calls the hook (it only renders when Clerk is mounted).
function AuthControls() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;

  return (
    <div className="auth-overlay">
      {isSignedIn ? (
        <UserButton
          appearance={{ elements: { userButtonAvatarBox: "h-9 w-9" } }}
        />
      ) : (
        <SignInButton mode="modal">
          <button type="button" className="auth-btn">
            Sign in
          </button>
        </SignInButton>
      )}
    </div>
  );
}

// Anonymous-first: the shelf works with no account at all (books live in
// IndexedDB). This overlay is purely additive — a sign-in affordance in the
// corner. When Clerk isn't configured (no publishable key), it renders nothing
// so the reader keeps working untouched.
export function AuthOverlay() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null;
  return <AuthControls />;
}
