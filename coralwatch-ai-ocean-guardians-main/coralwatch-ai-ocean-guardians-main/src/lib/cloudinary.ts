// src/lib/cloudinary.ts

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

export async function uploadImageToCloudinary(file: File): Promise<string | null> {
    if (!CLOUD_NAME) {
        console.warn('VITE_CLOUDINARY_CLOUD_NAME is not set, skipping Cloudinary upload.');
        return null;
    }

    try {
        const formData = new FormData();
        formData.append('file', file);
        // You should create an unsigned upload preset in Cloudinary named 'reef_uploads'
        formData.append('upload_preset', 'reef_uploads');

        const res = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!res.ok) {
            console.error('Cloudinary upload failed:', await res.text());
            return null;
        }

        const data = await res.json();
        return data.secure_url;
    } catch (err) {
        console.error('Error uploading to Cloudinary:', err);
        return null;
    }
}
