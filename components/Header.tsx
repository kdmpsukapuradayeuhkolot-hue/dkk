import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut } from 'lucide-react';
import ProfileModal from './ProfileModal';
import DbImage from './DbImage';

const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);

    return (
        <>
            <header className="flex items-center justify-between h-16 px-6 bg-gray-800 border-b border-gray-700 no-print">
                <div>
                    {/* Can add breadcrumbs or page title here */}
                </div>
                <div className="flex items-center">
                    <button
                        onClick={() => setProfileModalOpen(true)}
                        className="flex items-center mr-4 p-2 rounded-lg hover:bg-gray-700"
                        aria-label="Edit Profile"
                        title="Edit profil Anda"
                    >
                        <DbImage fileId={user?.photoFileId} placeholderType="avatar" className="h-9 w-9 rounded-full object-cover" />
                        <div className="text-left ml-3">
                            <div className="font-semibold text-gray-200">{user?.username}</div>
                            <div className="text-xs text-gray-400">{user?.role}</div>
                        </div>
                    </button>
                    <button
                        onClick={logout}
                        className="flex items-center px-3 py-2 text-sm font-medium bg-red-900 text-red-300 hover:bg-red-800 rounded-md"
                        aria-label="Logout"
                        title="Keluar dari sesi ini"
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                    </button>
                </div>
            </header>
            {isProfileModalOpen && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} />}
        </>
    );
};

export default Header;
