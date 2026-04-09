import { describe, it, expect } from 'vitest';
import { resizeImage } from '../resize';
import { uploadProblemImage, PROBLEM_IMAGES_BUCKET } from '../upload';

describe('lib/storage', () => {
  it('exports resizeImage as a function', () => {
    expect(typeof resizeImage).toBe('function');
  });

  it('exports uploadProblemImage as a function', () => {
    expect(typeof uploadProblemImage).toBe('function');
  });

  it('PROBLEM_IMAGES_BUCKET is "problem-images"', () => {
    expect(PROBLEM_IMAGES_BUCKET).toBe('problem-images');
  });
});
