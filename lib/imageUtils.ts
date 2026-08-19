/**
 * Utility to process, optimize and convert uploaded image files to lightweight,
 * high-definition Data URLs suitable for instant rendering and Firebase Firestore storage.
 */

export interface ProcessedImageResult {
  dataUrl: string;
  originalName: string;
  formattedSize: string;
  width: number;
  height: number;
}

export async function processAndOptimizeImage(
  file: File,
  maxWidth: number = 1600,
  maxHeight: number = 1600,
  quality: number = 0.85
): Promise<ProcessedImageResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O ficheiro selecionado não é uma imagem válida.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio resizing
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original reader result if canvas not supported
          resolve({
            dataUrl: e.target?.result as string,
            originalName: file.name,
            formattedSize: (file.size / 1024).toFixed(1) + ' KB',
            width: img.width,
            height: img.height,
          });
          return;
        }

        // Enable high-quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to high quality web-optimized JPEG
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        const approxSizeBytes = Math.round((optimizedDataUrl.length * 3) / 4);
        const formattedSize = 
          approxSizeBytes > 1024 * 1024
            ? (approxSizeBytes / (1024 * 1024)).toFixed(2) + ' MB'
            : (approxSizeBytes / 1024).toFixed(1) + ' KB';

        resolve({
          dataUrl: optimizedDataUrl,
          originalName: file.name,
          formattedSize,
          width,
          height,
        });
      };

      img.onerror = () => {
        reject(new Error('Erro ao carregar a imagem selecionada.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler o ficheiro do dispositivo.'));
    };

    reader.readAsDataURL(file);
  });
}
