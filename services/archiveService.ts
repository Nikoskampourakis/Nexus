import JSZip from 'jszip';

export interface ArchiveFileEntry {
  path: string;
  name: string;
  size: number;
  isDirectory: boolean;
  content?: string; // For text/code files
  binaryData?: Uint8Array;
  isText: boolean;
  mimeType?: string;
  isModified?: boolean;
}

export interface ArchivePackage {
  filename: string;
  type: 'zip' | 'tar' | 'tgz';
  files: ArchiveFileEntry[];
  totalSize: number;
}

// Common text / code extensions
const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss',
  'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'php',
  'rb', 'sh', 'yaml', 'yml', 'xml', 'toml', 'env', 'sql', 'dockerfile',
  'gitignore', 'graphql', 'svg', 'csv', 'ini', 'conf'
]);

export const isTextFile = (filename: string): boolean => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return TEXT_EXTENSIONS.has(ext) || filename.toLowerCase().includes('dockerfile');
};

/**
 * Extracts a ZIP file using JSZip
 */
export const unpackZipArchive = async (file: File | Blob | ArrayBuffer, originalFilename: string = 'archive.zip'): Promise<ArchivePackage> => {
  const zip = new JSZip();
  const loaded = await zip.loadAsync(file);

  const files: ArchiveFileEntry[] = [];
  let totalSize = 0;

  for (const [path, zipEntry] of Object.entries(loaded.files)) {
    if (zipEntry.dir) {
      files.push({
        path,
        name: path.split('/').filter(Boolean).pop() || path,
        size: 0,
        isDirectory: true,
        isText: false,
      });
      continue;
    }

    const name = path.split('/').pop() || path;
    const isText = isTextFile(name);

    if (isText) {
      const textContent = await zipEntry.async('string');
      const entrySize = textContent.length;
      totalSize += entrySize;
      files.push({
        path,
        name,
        size: entrySize,
        isDirectory: false,
        isText: true,
        content: textContent,
      });
    } else {
      const binaryData = await zipEntry.async('uint8array');
      totalSize += binaryData.byteLength;
      files.push({
        path,
        name,
        size: binaryData.byteLength,
        isDirectory: false,
        isText: false,
        binaryData,
      });
    }
  }

  return {
    filename: originalFilename,
    type: 'zip',
    files,
    totalSize,
  };
};

/**
 * Decompresses gzip stream if needed using browser native DecompressionStream
 */
const decompressGzipIfNeeded = async (buffer: ArrayBuffer): Promise<Uint8Array> => {
  const bytes = new Uint8Array(buffer);
  // Gzip magic number: 0x1f 0x8b
  if (bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    if (typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('gzip');
      const response = new Response(new Blob([buffer]).stream().pipeThrough(ds));
      const decompressed = await response.arrayBuffer();
      return new Uint8Array(decompressed);
    }
  }
  return bytes;
};

/**
 * Parses a TAR (ustar) archive from ArrayBuffer
 */
export const unpackTarArchive = async (file: File | Blob | ArrayBuffer, originalFilename: string = 'archive.tar'): Promise<ArchivePackage> => {
  const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const rawBytes = await decompressGzipIfNeeded(buffer);

  const files: ArchiveFileEntry[] = [];
  let offset = 0;
  let totalSize = 0;
  const decoder = new TextDecoder('utf-8');

  while (offset + 512 <= rawBytes.length) {
    const header = rawBytes.subarray(offset, offset + 512);

    // Check if empty block (end of archive)
    let isZero = true;
    for (let i = 0; i < 512; i++) {
      if (header[i] !== 0) {
        isZero = false;
        break;
      }
    }
    if (isZero) break;

    // File name: bytes 0-99
    let nameEnd = 0;
    while (nameEnd < 100 && header[nameEnd] !== 0) nameEnd++;
    let filename = decoder.decode(header.subarray(0, nameEnd)).trim();

    // Prefix for ustar (bytes 345-500)
    let prefixEnd = 345;
    while (prefixEnd < 500 && header[prefixEnd] !== 0) prefixEnd++;
    if (prefixEnd > 345) {
      const prefix = decoder.decode(header.subarray(345, prefixEnd)).trim();
      if (prefix) filename = `${prefix}/${filename}`;
    }

    // Size: bytes 124-135 (octal ascii)
    const sizeStr = decoder.decode(header.subarray(124, 136)).trim().replace(/\0/g, '');
    const size = parseInt(sizeStr, 8) || 0;

    // Type flag: byte 156
    const typeFlag = String.fromCharCode(header[156]);
    const isDir = typeFlag === '5' || filename.endsWith('/');

    offset += 512;

    if (isDir) {
      files.push({
        path: filename,
        name: filename.split('/').filter(Boolean).pop() || filename,
        size: 0,
        isDirectory: true,
        isText: false,
      });
    } else {
      const fileData = rawBytes.subarray(offset, offset + size);
      const isText = isTextFile(filename);
      totalSize += size;

      if (isText) {
        const textContent = decoder.decode(fileData);
        files.push({
          path: filename,
          name: filename.split('/').pop() || filename,
          size,
          isDirectory: false,
          isText: true,
          content: textContent,
        });
      } else {
        files.push({
          path: filename,
          name: filename.split('/').pop() || filename,
          size,
          isDirectory: false,
          isText: false,
          binaryData: fileData,
        });
      }

      // Tar blocks are padded to multiples of 512 bytes
      const padding = (512 - (size % 512)) % 512;
      offset += size + padding;
    }
  }

  const isTgz = originalFilename.endsWith('.tgz') || originalFilename.endsWith('.tar.gz');

  return {
    filename: originalFilename,
    type: isTgz ? 'tgz' : 'tar',
    files,
    totalSize,
  };
};

/**
 * Universal archive unpacker for .zip, .tar, .tar.gz, .tgz
 */
export const unpackArchive = async (file: File | Blob, filename: string): Promise<ArchivePackage> => {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.tar') || lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    return unpackTarArchive(file, filename);
  }
  return unpackZipArchive(file, filename);
};

/**
 * Repacks files into a ZIP archive and triggers download
 */
export const repackAndDownloadZip = async (
  files: ArchiveFileEntry[],
  outputFilename: string = 'updated_archive.zip'
): Promise<Blob> => {
  const zip = new JSZip();

  files.forEach((f) => {
    if (f.isDirectory) {
      zip.folder(f.path);
    } else if (f.content !== undefined) {
      zip.file(f.path, f.content);
    } else if (f.binaryData) {
      zip.file(f.path, f.binaryData);
    }
  });

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = outputFilename.endsWith('.zip') ? outputFilename : `${outputFilename}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return blob;
};

/**
 * Repacks files into a standard TAR format and triggers download
 */
export const repackAndDownloadTar = async (
  files: ArchiveFileEntry[],
  outputFilename: string = 'updated_archive.tar'
): Promise<Blob> => {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  files.forEach((f) => {
    const isDir = f.isDirectory;
    const path = isDir && !f.path.endsWith('/') ? `${f.path}/` : f.path;
    const dataBytes = isDir ? new Uint8Array(0) : f.content !== undefined ? encoder.encode(f.content) : f.binaryData || new Uint8Array(0);
    const size = dataBytes.byteLength;

    // Create 512-byte header
    const header = new Uint8Array(512);

    // Name (0-99)
    const nameBytes = encoder.encode(path.substring(0, 99));
    header.set(nameBytes, 0);

    // Mode (100-107) -> "0000755\0" or "0000644\0"
    const mode = isDir ? '0000755 ' : '0000644 ';
    header.set(encoder.encode(mode), 100);

    // UID/GID
    header.set(encoder.encode('0001000 '), 108);
    header.set(encoder.encode('0001000 '), 116);

    // Size (124-135) in octal
    const sizeOctal = size.toString(8).padStart(11, '0') + ' ';
    header.set(encoder.encode(sizeOctal), 124);

    // Mtime (136-147)
    const mtimeOctal = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + ' ';
    header.set(encoder.encode(mtimeOctal), 136);

    // Typeflag (156)
    header[156] = isDir ? 53 : 48; // '5' for dir, '0' for file

    // Magic "ustar\0" (257-262)
    header.set(encoder.encode('ustar\0'), 257);
    header.set(encoder.encode('00'), 263);

    // Checksum calculation (bytes 148-155 initially filled with spaces)
    for (let i = 148; i < 156; i++) header[i] = 32;
    let checksum = 0;
    for (let i = 0; i < 512; i++) checksum += header[i];
    const checksumOctal = checksum.toString(8).padStart(6, '0') + '\0 ';
    header.set(encoder.encode(checksumOctal), 148);

    chunks.push(header);

    if (!isDir && size > 0) {
      chunks.push(dataBytes);
      const padding = (512 - (size % 512)) % 512;
      if (padding > 0) {
        chunks.push(new Uint8Array(padding));
      }
    }
  });

  // 1024 zero bytes at end of TAR
  chunks.push(new Uint8Array(1024));

  const blob = new Blob(chunks, { type: 'application/x-tar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = outputFilename.endsWith('.tar') ? outputFilename : `${outputFilename}.tar`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return blob;
};

// Convenient aliases for packing archives
export const packZipArchive = repackAndDownloadZip;
export const packTarArchive = repackAndDownloadTar;

/**
 * Summarizes the archive's structure and code contents for sending to AI
 */
export const buildArchiveAiSummary = (pkg: ArchivePackage, maxTextCharLimit: number = 8000): string => {
  let summary = `### Archive File Tree: "${pkg.filename}" (${pkg.files.length} items, ${(pkg.totalSize / 1024).toFixed(1)} KB)\n\n`;

  summary += '```text\n';
  pkg.files.forEach((f) => {
    summary += `${f.isDirectory ? '📁 ' : '📄 '} ${f.path} (${(f.size / 1024).toFixed(1)} KB)\n`;
  });
  summary += '```\n\n';

  summary += `### Selected Key File Previews:\n\n`;
  let usedChars = 0;

  for (const f of pkg.files) {
    if (!f.isDirectory && f.isText && f.content) {
      const snippet = f.content.substring(0, 1500);
      summary += `#### File: \`${f.path}\`\n`;
      const ext = f.name.split('.').pop() || 'text';
      summary += '```' + ext + '\n' + snippet + (f.content.length > 1500 ? '\n...[truncated]' : '') + '\n```\n\n';
      usedChars += snippet.length;
      if (usedChars >= maxTextCharLimit) {
        summary += `*(Additional files omitted for brevity. You can ask me to inspect or edit any specific file!)*\n\n`;
        break;
      }
    }
  }

  return summary;
};
