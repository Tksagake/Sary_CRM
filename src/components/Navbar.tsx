import { FaHome, FaUserFriends, FaMoneyBill, FaFileAlt, FaBell, FaPhone, FaAngleDown } from "react-icons/fa";
import { useState } from "react";

export default function Navbar() {
  return (
    <aside className="w-64 bg-blue-900 text-white p-6 h-screen flex flex-col fixed left-0 top-0">
      <h2 className="text-2xl font-bold mb-6">Sary CRM</h2>
      <nav className="flex-1 space-y-3">
        <NavItem link="/dashboard" label="Dashboard" icon={<FaHome />} />
        <DropdownMenu label="Debtors" icon={<FaUserFriends />}>
          <NavItem link="/dashboard/debtors" label="View Debtors" />
          <NavItem link="/dashboard/debtors/import" label="Import Debtors" />
          <NavItem link="/dashboard/debtors/follow-ups" label="Follow-Ups" />
        </DropdownMenu>
        <DropdownMenu label="Payments" icon={<FaMoneyBill />}>
          <NavItem link="/dashboard/payments" label="Payment Tracking" />
          <NavItem link="/dashboard/payments/approve" label="Approve PoP" />
        </DropdownMenu>
        <DropdownMenu label="Reports" icon={<FaFileAlt />}>
          <NavItem link="/dashboard/reports/monthly" label="Monthly Reports" />
          <NavItem link="/dashboard/reports/performance" label="Performance Dashboard" />
        </DropdownMenu>
        <DropdownMenu label="Notifications" icon={<FaBell />}>
          <NavItem link="/dashboard/notifications/sms" label="Bulk SMS" />
          <NavItem link="/dashboard/notifications/reminders" label="Agent Reminders" />
        </DropdownMenu>
        <DropdownMenu label="Communication" icon={<FaPhone />}>
          <NavItem link="/dashboard/communication/calls" label="Call Log" />
          <NavItem link="/dashboard/communication/sms" label="SMS Log" />
          <NavItem link="/dashboard/communication/emails" label="Email Log" />
        </DropdownMenu>
      </nav>
    </aside>
  );
}

function NavItem({ link, label, icon }: { link: string; label: string; icon?: React.ReactNode }) {
  return (
    <li>
      <a href={link} className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-700 transition">
        {icon} <span>{label}</span>
      </a>
    </li>
  );
}

function DropdownMenu({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full p-3 rounded-lg hover:bg-blue-700 transition"
      >
        <span className="flex items-center gap-3">
          {icon} {label}
        </span>
        <FaAngleDown className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <ul className="ml-5 space-y-2">{children}</ul>}
    </div>
  );
}
