"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Debtors", path: "/dashboard/debtors" },
  { name: "Payments", path: "/dashboard/payments" },
  { name: "Reports", path: "/dashboard/reports" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 h-screen bg-blue-600 text-white p-4">
      <h2 className="text-2xl font-bold mb-6">SaryCRM</h2>
      <nav>
        <ul>
          {menuItems.map((item) => (
            <li key={item.path} className={`mb-2 ${pathname === item.path ? "font-bold" : ""}`}>
              <Link href={item.path} className="block px-4 py-2 hover:bg-blue-700 rounded">
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
