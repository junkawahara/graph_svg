/**
 * Graph file format type
 */
export type GraphFileFormat = 'edgelist' | 'dimacs';

/**
 * Parsed graph data
 */
export interface ParsedGraph {
  format: GraphFileFormat;
  nodeLabels: string[];
  edges: Array<{ source: string; target: string; label?: string }>;
  vertexCount?: number;  // From DIMACS p line
  edgeCount?: number;    // From DIMACS p line
}

/**
 * Parser for graph files (Edge List and DIMACS formats)
 */
export class GraphFileParser {
  /**
   * Detect file format from content and optional filename
   */
  static detectFormat(content: string, filename?: string): GraphFileFormat {
    // Check extension hint
    if (filename) {
      const ext = filename.toLowerCase().split('.').pop();
      if (ext === 'dimacs' || ext === 'col') {
        return 'dimacs';
      }
    }

    // Check content
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('#')) continue;
      if (trimmed.startsWith('c ')) continue; // DIMACS comment

      // DIMACS starts with 'p n m', 'p edge n m', or 'e src dst'
      if (/^p\s+(\w+\s+)?\d+\s+\d+/.test(trimmed)) return 'dimacs';
      if (/^e\s+\S+\s+\S+/.test(trimmed)) return 'dimacs';

      // Otherwise, assume edge list
      break;
    }

    return 'edgelist';
  }

  /**
   * Parse graph file content
   */
  static parse(content: string, filename?: string): ParsedGraph {
    const format = this.detectFormat(content, filename);

    if (format === 'dimacs') {
      return this.parseDimacs(content);
    } else {
      return this.parseEdgeList(content);
    }
  }

  /**
   * Parse Edge List format
   * Each line: source target [label]
   * Lines starting with # are comments
   */
  private static parseEdgeList(content: string): ParsedGraph {
    const nodeSet = new Set<string>();
    const edges: Array<{ source: string; target: string; label?: string }> = [];

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('#')) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const source = parts[0];
        const target = parts[1];
        const label = parts.length >= 3 ? parts[2] : undefined;

        nodeSet.add(source);
        nodeSet.add(target);
        edges.push({ source, target, label });
      }
    }

    return {
      format: 'edgelist',
      nodeLabels: Array.from(nodeSet),
      edges
    };
  }

  /**
   * Parse DIMACS variant format
   * p n m - vertex count and edge count
   * c ... - comment line
   * e src dst - edge definition
   */
  private static parseDimacs(content: string): ParsedGraph {
    const nodeSet = new Set<string>();
    const edges: Array<{ source: string; target: string; label?: string }> = [];
    let vertexCount: number | undefined;
    let edgeCount: number | undefined;

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('c ')) continue;

      // Problem line: p n m or p edge n m (standard DIMACS format)
      const pMatch = trimmed.match(/^p\s+(?:\w+\s+)?(\d+)\s+(\d+)/);
      if (pMatch) {
        vertexCount = parseInt(pMatch[1], 10);
        edgeCount = parseInt(pMatch[2], 10);
        continue;
      }

      // Edge line: e src dst
      const eMatch = trimmed.match(/^e\s+(\S+)\s+(\S+)/);
      if (eMatch) {
        const source = eMatch[1];
        const target = eMatch[2];
        nodeSet.add(source);
        nodeSet.add(target);
        edges.push({ source, target });
      }
    }

    // Handle isolated vertices if vertexCount > nodeSet.size
    const nodeLabels = Array.from(nodeSet);
    if (vertexCount && vertexCount > nodeLabels.length) {
      // Add isolated nodes with sequential labels
      let isolatedIndex = 1;
      while (nodeLabels.length < vertexCount) {
        const label = String(isolatedIndex);
        if (!nodeSet.has(label)) {
          nodeLabels.push(label);
          nodeSet.add(label);
        }
        isolatedIndex++;
      }
    }

    return {
      format: 'dimacs',
      nodeLabels,
      edges,
      vertexCount,
      edgeCount
    };
  }
}
