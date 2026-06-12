import { ConfigService } from "@nestjs/config";
import ImageKit from "imagekit";
import { ImageKitService } from "./image-kit.service";

jest.mock("imagekit");

const MockImageKit = ImageKit as unknown as jest.Mock;

const ENV: Record<string, string> = {
  IMAGEKIT_PUBLIC_KEY: "pub",
  IMAGEKIT_PRIVATE_KEY: "priv",
  IMAGEKIT_URL_ENDPOINT: "https://ik.imagekit.io/test",
};

describe("ImageKitService", () => {
  let service: ImageKitService;
  let upload: jest.Mock;
  let deleteFile: jest.Mock;

  beforeEach(() => {
    upload = jest.fn();
    deleteFile = jest.fn();
    MockImageKit.mockImplementation(() => ({ upload, deleteFile }));
    const config = {
      getOrThrow: jest.fn((key: string) => ENV[key]),
    } as unknown as ConfigService;
    service = new ImageKitService(config);
  });

  describe("upload", () => {
    it("calls imagekit.upload with a slugified, uuid-suffixed fileName and returns fileId + filePath", async () => {
      upload.mockResolvedValue({
        fileId: "fid-1",
        filePath: "/pedals/big-muff-pi-abc.jpg",
      });
      const result = await service.upload({
        buffer: Buffer.from("img"),
        filenameHint: "Big Muff Pi",
        folder: "pedals",
      });
      expect(upload).toHaveBeenCalledWith({
        file: expect.any(Buffer),
        fileName: expect.stringMatching(
          /^big-muff-pi-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/,
        ),
        folder: "pedals",
      });
      expect(result).toEqual({
        fileId: "fid-1",
        filePath: "/pedals/big-muff-pi-abc.jpg",
      });
    });

    it("propagates SDK errors", async () => {
      upload.mockRejectedValue(new Error("boom"));
      await expect(
        service.upload({
          buffer: Buffer.from("x"),
          filenameHint: "x",
          folder: "pedals",
        }),
      ).rejects.toThrow("boom");
    });
  });

  describe("delete", () => {
    it("calls imagekit.deleteFile with the fileId", async () => {
      deleteFile.mockResolvedValue(undefined);
      await service.delete("fid-1");
      expect(deleteFile).toHaveBeenCalledWith("fid-1");
    });

    it("swallows a 404 (idempotent on already-deleted)", async () => {
      deleteFile.mockRejectedValue({ httpStatusCode: 404 });
      await expect(service.delete("missing")).resolves.toBeUndefined();
    });

    it("re-throws any other error", async () => {
      deleteFile.mockRejectedValue({ httpStatusCode: 500, message: "nope" });
      await expect(service.delete("fid-1")).rejects.toEqual({
        httpStatusCode: 500,
        message: "nope",
      });
    });
  });

  describe("buildUrl", () => {
    it("returns urlEndpoint + path with no query when no transforms", () => {
      expect(service.buildUrl("/pedals/foo.jpg")).toBe(
        "https://ik.imagekit.io/test/pedals/foo.jpg",
      );
    });

    it("appends tr query for w/h/fo transforms", () => {
      const url = service.buildUrl("/pedals/foo.jpg", {
        w: 800,
        h: 800,
        fo: "auto",
      });
      expect(url).toBe("https://ik.imagekit.io/test/pedals/foo.jpg?tr=w-800,h-800,fo-auto");
    });
  });
});
