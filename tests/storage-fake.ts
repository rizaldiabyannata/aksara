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
    copyObject: async (from: string, to: string) => {
      const o = objects.get(from);
      if (!o) throw new Error("NoSuchKey");
      objects.set(to, { ...o });
    },
    presignGet: async (key: string) => `https://r2.test/${key}?sig=1`,
  };
}
