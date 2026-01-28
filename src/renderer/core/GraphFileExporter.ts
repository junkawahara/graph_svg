/**
 * Graph File Exporter
 *
 * Exports graph data (nodes and edges) to Edge List or DIMACS format.
 */

import { Node } from '../shapes/Node';
import { Edge } from '../shapes/Edge';

/**
 * Export format types
 */
export type GraphExportFormat = 'edgelist' | 'dimacs';

/**
 * Export scope
 */
export type GraphExportScope = 'all' | 'selection';

/**
 * Export options
 */
export interface GraphExportOptions {
  format: GraphExportFormat;
  scope: GraphExportScope;
}

/**
 * Warning about problematic labels
 */
export interface LabelWarning {
  type: 'node' | 'edge';
  labels: string[];
  totalCount: number;
}

/**
 * Result of label validation
 */
export interface LabelValidationResult {
  valid: boolean;
  warnings: LabelWarning[];
}

/**
 * Check if a label contains problematic characters (spaces, tabs, newlines)
 */
function hasProblematicCharacters(label: string): boolean {
  return /[\s\t\n\r]/.test(label);
}

/**
 * Validate labels for export
 * Returns warnings if any labels contain spaces or special characters
 */
export function validateLabels(nodes: Node[], edges: Edge[]): LabelValidationResult {
  const warnings: LabelWarning[] = [];

  // Check node labels
  const problematicNodeLabels = nodes
    .filter(node => node.label && hasProblematicCharacters(node.label))
    .map(node => node.label);

  if (problematicNodeLabels.length > 0) {
    warnings.push({
      type: 'node',
      labels: problematicNodeLabels.slice(0, 5),
      totalCount: problematicNodeLabels.length
    });
  }

  // Check edge labels
  const problematicEdgeLabels = edges
    .filter(edge => edge.label && hasProblematicCharacters(edge.label))
    .map(edge => edge.label as string);

  if (problematicEdgeLabels.length > 0) {
    warnings.push({
      type: 'edge',
      labels: problematicEdgeLabels.slice(0, 5),
      totalCount: problematicEdgeLabels.length
    });
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * Format warning message for display
 */
export function formatWarningMessage(warnings: LabelWarning[]): string {
  const lines: string[] = [];

  for (const warning of warnings) {
    const typeLabel = warning.type === 'node' ? 'ノードラベル' : 'エッジラベル';
    const labelsStr = warning.labels.map(l => `'${l}'`).join(', ');
    const remaining = warning.totalCount - warning.labels.length;

    let message = `以下の${typeLabel}にスペースまたは特殊文字が含まれています:\n${labelsStr}`;
    if (remaining > 0) {
      message += `\n...他${remaining}件`;
    }
    lines.push(message);
  }

  return lines.join('\n\n');
}

/**
 * Export to Edge List format
 *
 * Format:
 * source target [label]
 *
 * - One edge per line
 * - Edge labels are optional (3rd column)
 * - Direction is ignored (all edges treated as undirected)
 * - Isolated nodes are not exported
 */
export function toEdgeList(nodes: Node[], edges: Edge[]): string {
  // Create node ID to label map
  const nodeIdToLabel = new Map<string, string>();
  for (const node of nodes) {
    nodeIdToLabel.set(node.id, node.label);
  }

  const lines: string[] = [];

  for (const edge of edges) {
    const sourceLabel = nodeIdToLabel.get(edge.sourceNodeId) || edge.sourceNodeId;
    const targetLabel = nodeIdToLabel.get(edge.targetNodeId) || edge.targetNodeId;

    let line = `${sourceLabel} ${targetLabel}`;
    if (edge.label) {
      line += ` ${edge.label}`;
    }
    lines.push(line);
  }

  return lines.join('\n') + '\n';
}

/**
 * Export to DIMACS format
 *
 * Format:
 * p n m          (header: n nodes, m edges)
 * c 1: label     (comment: node number to label mapping)
 * e src dst      (edge: source to target, using node numbers)
 *
 * - Nodes are numbered 1 to n in creation order
 * - Isolated nodes are included in the node count
 * - Edge labels are NOT exported
 * - Direction is ignored (all edges treated as undirected)
 */
export function toDimacs(nodes: Node[], edges: Edge[]): string {
  // Create node ID to number map (1-indexed)
  const nodeIdToNumber = new Map<string, number>();
  let nodeNumber = 1;
  for (const node of nodes) {
    nodeIdToNumber.set(node.id, nodeNumber);
    nodeNumber++;
  }

  const lines: string[] = [];

  // Header: p n m
  lines.push(`p ${nodes.length} ${edges.length}`);

  // Comment lines: node label mappings
  for (const node of nodes) {
    const num = nodeIdToNumber.get(node.id);
    lines.push(`c ${num}: ${node.label}`);
  }

  // Edge lines
  for (const edge of edges) {
    const sourceNum = nodeIdToNumber.get(edge.sourceNodeId);
    const targetNum = nodeIdToNumber.get(edge.targetNodeId);

    if (sourceNum !== undefined && targetNum !== undefined) {
      lines.push(`e ${sourceNum} ${targetNum}`);
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Export graph to specified format
 */
export function exportGraph(
  nodes: Node[],
  edges: Edge[],
  format: GraphExportFormat
): string {
  switch (format) {
    case 'edgelist':
      return toEdgeList(nodes, edges);
    case 'dimacs':
      return toDimacs(nodes, edges);
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}
