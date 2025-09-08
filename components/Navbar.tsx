"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useBasket } from "@/lib/basket-context";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/signin");
    } catch (err) {
      // keep simple: log error
      // eslint-disable-next-line no-console
      console.error("Sign out failed:", err);
    }
  };

  return (
    <nav className="w-full border-b bg-background/50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold">
          Closet
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/chat" className="text-sm">Chat</Link>
          <Link href="/basket" className="text-sm">Basket{` (${useBasket().items.length})`}</Link>
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">
                {user.displayName || user.email || "Account"}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Link href="/signin">
              <Button variant="default" size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
