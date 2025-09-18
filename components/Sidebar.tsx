
import React from 'react';
import { NavLink } from 'react-router-dom';
import type { LucideProps } from 'lucide-react';
import { Store } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import DbImage from './DbImage';

export interface NavItem {
    href: string;
    icon: React.ComponentType<LucideProps>;
    label: string;
}

interface SidebarProps {
    navItems: NavItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ navItems }) => {
    const activeLinkClass = "bg-blue-600 text-white";
    const inactiveLinkClass = "text-gray-300 hover:bg-gray-700 hover:text-white";
    const settings = useLiveQuery(() => db.settings.get('app'));

    return (
        <div className="w-64 bg-gray-800 text-white flex flex-col no-print">
            <div className="flex items-center justify-center h-24 border-b border-gray-700 px-4">
                {settings?.logoUrl ? (
                    <DbImage fileId={settings.logoUrl} placeholderType="product" className="h-12 w-12 object-contain flex-shrink-0" />
                ) : (
                    <Store className="h-10 w-10 text-blue-400 flex-shrink-0" />
                )}
                <h1 className="text-2xl font-bold ml-2 truncate">{settings?.businessName || 'WarungPOS'}</h1>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        className={({ isActive }) =>
                            `flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-200 ${
                                isActive ? activeLinkClass : inactiveLinkClass
                            }`
                        }
                    >
                        <item.icon className="h-5 w-5 mr-3" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};

export default Sidebar;
