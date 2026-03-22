import {useState, useCallback} from 'react';
import type {Image as ImageType} from '@cloudcart/nitro';
import {Image} from '@cloudcart/nitro-react';

export function ProductImageGallery({images, featuredImage}: {
  images: ImageType[];
  featuredImage: ImageType | null;
}) {
  const allImages = images.length > 0 ? images : featuredImage ? [featuredImage] : [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = allImages[selectedIndex] ?? null;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSelectedIndex((i) => (i > 0 ? i - 1 : allImages.length - 1));
    } else if (e.key === 'ArrowRight') {
      setSelectedIndex((i) => (i < allImages.length - 1 ? i + 1 : 0));
    }
  }, [allImages.length]);

  if (!selectedImage) return <div className="product-image-placeholder" />;

  return (
    <div className="product-gallery" onKeyDown={allImages.length > 1 ? handleKeyDown : undefined}>
      <div className="product-gallery-main">
        <Image data={selectedImage} alt={selectedImage.altText ?? ''} loading="eager" />
      </div>
      {allImages.length > 1 && (
        <div className="product-gallery-thumbs" role="listbox" aria-label="Product images">
          {allImages.map((img, i) => (
            <button
              key={img.id ?? i}
              role="option"
              aria-selected={i === selectedIndex}
              className={`product-gallery-thumb${i === selectedIndex ? ' active' : ''}`}
              onClick={() => setSelectedIndex(i)}
              aria-label={img.altText || `Product image ${i + 1}`}
            >
              <Image data={img} alt={img.altText ?? ''} width={80} height={80} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
