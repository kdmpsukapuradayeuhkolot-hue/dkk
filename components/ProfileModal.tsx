import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../db/db';
import { X } from 'lucide-react';
import ImageUploader from './ImageUploader';
import { ensureError } from '../utils/errorUtils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    password: '',
    photoFileId: user?.photoFileId,
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !user) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const handleFileIdChange = (newFileId: string | null) => {
    setFormData(prev => ({ ...prev, photoFileId: newFileId as string | undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (!formData.username.trim()) {
      alert("Username tidak boleh kosong.");
      setIsSaving(false);
      return;
    }
    if (formData.password && formData.password.length < 6) {
      alert("Password baru minimal harus 6 karakter.");
      setIsSaving(false);
      return;
    }

    const usernameNorm = formData.username.trim().toLowerCase();
    
    try {
      const existingUser = await db.users.where('usernameNorm').equals(usernameNorm).first();
      if (existingUser && existingUser.id !== user.id) {
        alert('Username sudah digunakan. Mohon gunakan username lain.');
        return;
      }
      
      const dataToSave: { username: string; usernameNorm: string; photoFileId?: string; password?: string } = {
        username: formData.username,
        usernameNorm,
        photoFileId: formData.photoFileId,
      };

      if (formData.password) {
        dataToSave.password = formData.password;
      }
      
      await db.users.update(user.id!, dataToSave);
      
      // Update context and local storage
      updateUser(dataToSave);

      alert("Profil berhasil diperbarui.");
      onClose();

    } catch (error) {
      const err = ensureError(error);
      console.error("Failed to update profile:", err);
      alert(`Gagal memperbarui profil: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const inputClass = "w-full h-10 px-3 rounded-lg border border-neutral-700 bg-neutral-900 text-gray-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500";
  const labelClass = "text-sm font-medium text-gray-200";

  return (
    <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="relative z-61 w-[min(92vw,640px)] max-h-[85vh] overflow-y-auto nice-scrollbar rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 id="modal-title" className="text-lg font-semibold">Edit Profil</h2>
          <button type="button" onClick={onClose} title="Tutup" className="p-1 rounded-full text-gray-400 hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="sm:col-span-1">
              <label className={labelClass}>Foto Profil</label>
              <ImageUploader 
                fileId={formData.photoFileId}
                onFileIdChange={handleFileIdChange}
                kind="AVATAR"
                aspectRatioClass="aspect-square"
                placeholderType="avatar"
              />
            </div>
            <div className="sm:col-span-2 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="username" className={labelClass}>Username</label>
                <input type="text" name="username" id="username" value={formData.username} onChange={handleChange} required className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="password" className={labelClass}>Password Baru</label>
                <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} placeholder="Kosongkan jika tidak ingin ganti" className={inputClass} />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-10 rounded-lg px-4 font-medium border border-neutral-700 hover:bg-neutral-800">Batal</button>
            <button type="submit" disabled={isSaving} className="h-10 rounded-lg px-4 font-medium bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 disabled:opacity-50">
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
