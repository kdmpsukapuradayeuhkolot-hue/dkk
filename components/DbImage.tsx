
import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Package, User } from 'lucide-react';

interface DbImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fileId?: string | null;
  placeholderType?: 'product' | 'avatar';
}

const DbImage: React.FC<DbImageProps> = ({ fileId, className, alt, placeholderType = 'product', ...props }) => {
  const fileRecord = useLiveQuery(() => fileId ? db.files.get(fileId) : undefined, [fileId]);
  
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (fileRecord?.blob) {
      const url = URL.createObjectURL(fileRecord.blob);
      setImageUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setImageUrl(null);
      };
    }
  }, [fileRecord]);

  if (!fileId || !imageUrl) {
    const placeholderClass = `flex items-center justify-center bg-gray-700 text-gray-500 ${className}`;
    if (placeholderType === 'avatar') {
        return <div className={placeholderClass}><User className="h-1/2 w-1/2" /></div>;
    }
    return <div className={placeholderClass}><Package className="h-1/2 w-1/2" /></div>;
  }

  return <img src={imageUrl} alt={alt} className={className} {...props} />;
};

export default DbImage;