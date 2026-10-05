import { describe, it, expect } from "vitest";
import { mediaKind, extensionFor, bytesToMb, buildMediaPath, buildThumbnailPath } from "@/lib/storage";

function fakeFile(name: string, type: string, sizeBytes = 1000): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe("mediaKind", () => {
  it("reconoce una foto JPEG", () => {
    expect(mediaKind(fakeFile("foto.jpg", "image/jpeg"))).toBe("photo");
  });

  it("reconoce un vídeo MP4", () => {
    expect(mediaKind(fakeFile("video.mp4", "video/mp4"))).toBe("video");
  });

  it("rechaza un tipo no admitido (ej. un ejecutable)", () => {
    expect(mediaKind(fakeFile("virus.exe", "application/x-msdownload"))).toBeNull();
  });

  it("rechaza un PDF disfrazado de imagen por el nombre", () => {
    expect(mediaKind(fakeFile("documento.jpg", "application/pdf"))).toBeNull();
  });
});

describe("extensionFor", () => {
  it("usa la extensión del nombre de archivo cuando es razonable", () => {
    expect(extensionFor(fakeFile("mi-foto.PNG", "image/png"))).toBe("png");
  });
});

describe("bytesToMb", () => {
  it("convierte bytes a megabytes", () => {
    expect(bytesToMb(1024 * 1024)).toBe(1);
    expect(bytesToMb(5 * 1024 * 1024)).toBe(5);
  });
});

describe("rutas de almacenamiento", () => {
  it("la ruta del original vive bajo la carpeta del álbum", () => {
    expect(buildMediaPath("album-1", "media-1", "jpg")).toBe("album-1/media-1.jpg");
  });

  it("la miniatura tiene un prefijo distinto pero la misma carpeta", () => {
    expect(buildThumbnailPath("album-1", "media-1")).toBe("album-1/thumb_media-1.jpg");
  });
});
