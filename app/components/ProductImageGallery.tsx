import {useState} from 'react';
import type {Image as ImageType} from '@cloudcart/nitro';
import {Image} from '@cloudcart/nitro-react';

export function ProductImageGallery({images, featuredImage}: {
  images: ImageType[];
  featuredImage: ImageType | null;
}) {
  const allImages = images.length > 0 ? images : featuredImage ? [featuredImage] : [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = allImages[selectedIndex] ?? null;

  if (!selectedImage) return <div className="product-image-placeholder" />;

  return (
    <div className="product-gallery">
      <div className="product-gallery-main">
        <Image data={selectedImage} alt={selectedImage.altText ?? ''} loading="eager" />
      </div>
      {allImages.length > 1 && (
        <div className="product-gallery-thumbs">
          {allImages.map((img, i) => (
            <button
              key={img.id ?? i}
              className={`product-gallery-thumb ${i === selectedIndex ? 'active' : ''}`}
              onClick={() => setSelectedIndex(i)}
              aria-label={`View image ${i + 1}`}
            >
              <Image data={img} alt={img.altText ?? ''} width={80} height={80} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
