export async function preparePhoto(file: File, maxSide = 1280): Promise<Blob> {
  if (!file.size || file.size > 20 * 1024 * 1024) throw new Error('Выберите фотографию до 20 МБ.');
  if (file.type && !file.type.startsWith('image/')) throw new Error('Нужна фотография в формате JPEG, PNG или WebP.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); } catch { throw new Error('Не удалось прочитать фото. Выберите JPEG, PNG или переснимите вещь.'); }
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 60_000_000) throw new Error('Фотография слишком большая. Выберите меньший снимок.');
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Браузер не смог обработать фотографию.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не удалось уменьшить фото.')), 'image/jpeg', 0.85));
  } finally { URL.revokeObjectURL(url); }
}
export async function catalogInput(photo: Blob): Promise<string> {
  const resized = await preparePhoto(new File([photo], 'clothing', { type: photo.type }), 510);
  return new Promise((done, fail) => {
    const reader = new FileReader(); reader.onload = () => done(String(reader.result)); reader.onerror = () => fail(new Error('Не удалось подготовить фото.')); reader.readAsDataURL(resized);
  });
}
