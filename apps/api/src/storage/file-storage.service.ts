import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { get, put } from '@vercel/blob';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const excelContentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Injectable()
export class FileStorageService {
  constructor(private readonly config: ConfigService) {}

  async read(reference: string): Promise<Buffer> {
    if (/^https:\/\//i.test(reference)) {
      const result = await get(reference, {
        access: 'private',
        token: this.config.getOrThrow<string>('BLOB_READ_WRITE_TOKEN'),
      });
      if (!result?.stream || result.statusCode !== 200) {
        throw new NotFoundException(`File cloud tidak ditemukan: ${reference}`);
      }
      return Buffer.from(await new Response(result.stream).arrayBuffer());
    }

    return readFile(await this.resolveLocalPath(reference));
  }

  async writeGenerated(fileName: string, buffer: Buffer): Promise<string> {
    if (this.config.get<string>('STORAGE_DRIVER') === 'blob') {
      const blob = await put(`generated/${fileName}`, buffer, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: excelContentType,
        token: this.config.getOrThrow<string>('BLOB_READ_WRITE_TOKEN'),
      });
      return blob.url;
    }

    const path = await this.resolveLocalPath(`storage/generated/${fileName}`, true);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, buffer);
    return `storage/generated/${fileName}`;
  }

  private async resolveLocalPath(reference: string, allowMissing = false): Promise<string> {
    const candidates = [resolve(process.cwd(), reference), resolve(process.cwd(), '..', '..', reference)];
    for (const candidate of candidates) {
      try {
        await access(allowMissing ? dirname(candidate) : candidate);
        return candidate;
      } catch {
        // Coba root monorepo ketika API berjalan dari direktori package.
      }
    }
    if (allowMissing) return join(resolve(process.cwd(), '..', '..'), reference);
    throw new NotFoundException(`File tidak ditemukan: ${reference}`);
  }
}
