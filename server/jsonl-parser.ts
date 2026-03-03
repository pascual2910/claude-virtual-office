import { open, stat } from 'node:fs/promises';

/**
 * Incremental JSONL tail-reader that tracks byte offsets per file.
 * Reads only new lines appended since the last read.
 */
export class JsonlTailReader {
  private offsets = new Map<string, number>();
  private partialLines = new Map<string, string>();

  /**
   * Read only new complete JSONL lines appended since last read.
   * Returns parsed JSON objects for each valid line.
   */
  async readNew(filePath: string): Promise<any[]> {
    let fileSize: number;
    try {
      const st = await stat(filePath);
      fileSize = st.size;
    } catch {
      // File doesn't exist or can't be accessed
      return [];
    }

    const currentOffset = this.offsets.get(filePath) ?? 0;

    if (fileSize <= currentOffset) {
      // No new data (or file was truncated/reset)
      if (fileSize < currentOffset) {
        // File was truncated — reset offset
        this.offsets.set(filePath, 0);
        this.partialLines.delete(filePath);
      }
      return [];
    }

    const bytesToRead = fileSize - currentOffset;
    const buffer = Buffer.alloc(bytesToRead);

    let fd;
    try {
      fd = await open(filePath, 'r');
      const { bytesRead } = await fd.read(buffer, 0, bytesToRead, currentOffset);

      if (bytesRead === 0) {
        return [];
      }

      const chunk = buffer.subarray(0, bytesRead).toString('utf-8');
      this.offsets.set(filePath, currentOffset + bytesRead);

      // Prepend any leftover partial line from previous read
      const partial = this.partialLines.get(filePath) ?? '';
      const combined = partial + chunk;

      const lines = combined.split('\n');

      // Last element is either empty (if chunk ended with \n) or a partial line
      const lastLine = lines.pop() ?? '';
      if (lastLine.length > 0) {
        // Incomplete line — save for next read
        this.partialLines.set(filePath, lastLine);
      } else {
        this.partialLines.delete(filePath);
      }

      const results: any[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        try {
          results.push(JSON.parse(trimmed));
        } catch {
          // Skip malformed JSON lines
        }
      }

      return results;
    } catch {
      // File read error — return what we have
      return [];
    } finally {
      await fd?.close();
    }
  }

  /**
   * Reset tracking for a specific file.
   */
  reset(filePath: string): void {
    this.offsets.delete(filePath);
    this.partialLines.delete(filePath);
  }

  /**
   * Reset all tracking state.
   */
  resetAll(): void {
    this.offsets.clear();
    this.partialLines.clear();
  }
}
