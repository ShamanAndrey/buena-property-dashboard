"use client";

import { Building2Icon, HomeIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
	{ href: "/", label: "Dashboard", icon: HomeIcon, exact: true },
	{
		href: "/properties",
		label: "Properties",
		icon: Building2Icon,
		exact: false,
	},
];

export function SidebarNav() {
	const pathname = usePathname();

	return (
		<nav className="flex-1 space-y-1 p-4">
			{navItems.map((item) => {
				const isActive = item.exact
					? pathname === item.href
					: pathname === item.href || pathname.startsWith(`${item.href}/`);

				return (
					<Link
						className={cn(
							"flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-colors hover:bg-accent",
							isActive
								? "bg-accent text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
						href={item.href}
						key={item.href}
					>
						<item.icon className="size-4" />
						{item.label}
					</Link>
				);
			})}
		</nav>
	);
}
