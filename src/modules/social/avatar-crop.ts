export type CropPosition = { x: number; y: number; zoom: number };
export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
export function cropGeometry(width: number, height: number, view: number, position: CropPosition) {
  if (width <= 0 || height <= 0 || view <= 0) throw new Error('Invalid image dimensions');
  const scale = Math.max(view / width, view / height) * clamp(position.zoom, 1, 3);
  const drawnWidth = width * scale;
  const drawnHeight = height * scale;
  const panX = (drawnWidth - view) / 2;
  const panY = (drawnHeight - view) / 2;
  return {
    width: drawnWidth,
    height: drawnHeight,
    left: (view - drawnWidth) / 2 + clamp(position.x, -1, 1) * panX,
    top: (view - drawnHeight) / 2 + clamp(position.y, -1, 1) * panY,
    panX,
    panY,
  };
}
