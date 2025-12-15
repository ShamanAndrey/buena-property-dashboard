import { Building2Icon, LogInIcon, LogOutIcon } from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "@/server/better-auth";
import { getSession } from "@/server/better-auth/server";
import { SidebarNav } from "./sidebar-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Building2Icon className="size-6 text-primary" />
          <span className="font-semibold text-lg tracking-tight">Buena</span>
        </div>

        {/* Navigation */}
        <SidebarNav />

        {/* User section */}
        <div className="border-t p-4">
          {session ? (
            <>
              <div className="flex items-center gap-3">
                {session.user.image ? (
                  <Image
                    alt={session.user.name ?? "User avatar"}
                    className="size-9 rounded-full"
                    height={36}
                    src={session.user.image}
                    width={36}
                  />
                ) : (
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
                    {session.user.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="truncate font-medium text-sm">
                    {session.user.name}
                  </p>
                  <p className="truncate text-muted-foreground text-xs">
                    {session.user.email}
                  </p>
                </div>
              </div>
              <form className="mt-3">
                <Button
                  className="w-full justify-start gap-2"
                  formAction={async () => {
                    "use server";
                    await auth.api.signOut({
                      headers: await headers(),
                    });
                    redirect("/");
                  }}
                  size="sm"
                  type="submit"
                  variant="ghost"
                >
                  <LogOutIcon className="size-4" />
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-sm">
                  ?
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate font-medium text-sm">Guest</p>
                  <p className="truncate text-muted-foreground text-xs">
                    Not signed in
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="w-full gap-2"
                size="sm"
                variant="outline"
              >
                <Link href="/properties">
                  <LogInIcon className="size-4" />
                  Sign in
                </Link>
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 pl-64">
        <div className="h-full">{children}</div>
      </main>
    </div>
  );
}
