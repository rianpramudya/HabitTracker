import { describe, expect, it } from 'vitest';
import { cropGeometry } from '@/modules/social/avatar-crop';

describe('avatar crop geometry', () => {
  it('fills the circular viewport and centers a landscape image', () => {
    const frame = cropGeometry(800, 400, 248, { x: 0, y: 0, zoom: 1 });
    expect(frame).toMatchObject({ width: 496, height: 248, left: -124, top: 0 });
  });
  it('moves and zooms within image bounds', () => {
    const frame = cropGeometry(800, 400, 248, { x: 1, y: -1, zoom: 2 });
    expect(frame.left).toBe(0);
    expect(frame.top + frame.height).toBe(248);
    expect(frame.width).toBeGreaterThan(248);
  });
  it('clamps invalid pan and zoom values', () => {
    expect(cropGeometry(400, 400, 248, { x: 99, y: -99, zoom: 0 })).toMatchObject({
      left: 0,
      top: 0,
    });
  });
});
