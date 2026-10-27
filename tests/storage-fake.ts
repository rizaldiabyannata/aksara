// In-memory stand-in for lib/storage (R2). Use via vi.mock in tests.
export const objects = new Map<string, { body: Buffer; contentType: string }>();

export function storageMock() {
  return {
    putImage: async (key: string, body: Buffer, contentType: string) => {
      objects.set(key, { body, contentType });
    },
    deleteImage: async (key: string) => {
      objects.delete(key);
    },
    presignGet: async (key: string) => `https://r2.test/${key}?sig=1`,
  };
}
