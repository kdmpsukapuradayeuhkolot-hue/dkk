import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import Header from '../Header';
import { Shield, Users, Package, Truck, Users2, FileText, ShoppingCart, BarChart2, LogOut, Settings } from 'lucide-react';
import type { NavItem } from '../Sidebar';


const adminNavItems: NavItem[] = [
    { href: '/admin/dashboard', icon: BarChart2, label: 'Dashboard' },
    { href: '/admin/users', icon: Users, label: 'Pengguna' },
    { href: '/admin/products', icon: Package, label: 'Produk' },
    { href: '/admin/suppliers', icon: Truck, label: 'Supplier' },
    { href: '/admin/incoming-goods', icon: ShoppingCart, label: 'Barang Masuk' },
    { href: '/admin/customers', icon: Users2, label: 'Pelanggan' },
    { href: '/admin/reports', icon: FileText, label: 'Laporan' },
    { href: '/admin/settings', icon: Settings, label: 'Pengaturan' },
];

const AdminLayout: React.FC = () => {
    const location = useLocation();
    const filteredNavItems = adminNavItems.filter(item => {
        if (location.pathname === '/admin/reports') {
            return item.href !== '/admin/incoming-goods';
        }
        return true;
    });

    return (
        <div className="flex h-screen bg-gray-900">
            <Sidebar navItems={filteredNavItems} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
