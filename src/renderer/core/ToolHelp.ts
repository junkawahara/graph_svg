import { ToolType } from '../../shared/types';

/**
 * Help text for each tool
 */
export interface ToolHelpInfo {
  name: string;
  shortcut: string | null;
  description: string;
  usage: string[];
}

/**
 * Tool help definitions
 */
export const toolHelp: Record<ToolType, ToolHelpInfo> = {
  select: {
    name: '選択',
    shortcut: 'V',
    description: '図形の選択・移動・リサイズ',
    usage: [
      'クリック: 図形を選択',
      'Shift+クリック: 選択に追加',
      'ドラッグ: 選択図形を移動',
      '空白からドラッグ: 範囲選択',
      'Alt+ドラッグ: 交差選択'
    ]
  },
  line: {
    name: '直線',
    shortcut: 'L',
    description: '始点から終点まで直線を描画',
    usage: [
      'ドラッグ: 直線を描画',
      'Shift+ドラッグ: 45°単位に角度を固定'
    ]
  },
  ellipse: {
    name: '楕円',
    shortcut: 'E',
    description: '楕円または正円を描画',
    usage: [
      'ドラッグ: 楕円を描画',
      'Shift+ドラッグ: 正円を描画',
      'Alt+ドラッグ: 中心から描画'
    ]
  },
  rectangle: {
    name: '長方形',
    shortcut: 'R',
    description: '長方形または正方形を描画',
    usage: [
      'ドラッグ: 長方形を描画',
      'Shift+ドラッグ: 正方形を描画',
      'Alt+ドラッグ: 中心から描画'
    ]
  },
  polygon: {
    name: '多角形',
    shortcut: '5',
    description: '頂点をクリックして閉じた多角形を描画',
    usage: [
      'クリック: 頂点を追加',
      'ダブルクリック/Enter: 完了',
      'Escape: キャンセル'
    ]
  },
  polyline: {
    name: 'ポリライン',
    shortcut: 'Y',
    description: '頂点をクリックして折れ線を描画',
    usage: [
      'クリック: 頂点を追加',
      'ダブルクリック/Enter: 完了',
      'Escape: キャンセル'
    ]
  },
  path: {
    name: 'パス',
    shortcut: 'P',
    description: '直線と曲線でパスを描画',
    usage: [
      'クリック: 直線セグメント追加',
      'Shift+クリック: 曲線セグメント追加',
      '始点付近クリック: パスを閉じる',
      'ダブルクリック/Enter: 開いたパスで完了',
      'Escape: キャンセル'
    ]
  },
  text: {
    name: 'テキスト',
    shortcut: 'T',
    description: 'クリック位置にテキストを配置',
    usage: [
      'クリック: テキスト入力ダイアログを開く',
      'テキストを入力してOKで配置'
    ]
  },
  node: {
    name: 'ノード',
    shortcut: 'N',
    description: 'クリック位置にグラフノードを配置',
    usage: [
      'クリック: ノードを配置してラベル入力',
      'ノードは楕円＋ラベルで表示'
    ]
  },
  edge: {
    name: 'エッジ',
    shortcut: 'W',
    description: '2つのノードをエッジで接続',
    usage: [
      'ノードクリック→別ノードクリック: エッジ作成',
      'ノードからノードへドラッグ: エッジ作成',
      '同じノードを2回クリック: 自己ループ作成',
      'ツールバーで有向/無向を切替'
    ]
  },
  'delete-node': {
    name: 'ノード削除',
    shortcut: null,
    description: 'ノードと接続エッジを削除',
    usage: [
      'ノードをクリック: ノードと接続エッジを削除',
      'ホバーでプレビュー（赤ハイライト）'
    ]
  },
  'delete-edge': {
    name: 'エッジ削除',
    shortcut: null,
    description: 'エッジを削除',
    usage: [
      'エッジをクリック: エッジを削除',
      'ホバーでプレビュー（赤ハイライト）'
    ]
  },
  pan: {
    name: 'パン',
    shortcut: 'H',
    description: 'キャンバスをパン（移動）',
    usage: [
      'ドラッグ: キャンバスをパン',
      'Space+ドラッグ: 他ツールでもパン可能'
    ]
  },
  zoom: {
    name: 'ズーム',
    shortcut: 'Z',
    description: 'ズームイン・ズームアウト',
    usage: [
      'クリック: ズームイン',
      'Alt+クリック: ズームアウト',
      'マウスホイール: カーソル位置でズーム'
    ]
  },
  rotate: {
    name: '回転',
    shortcut: 'O',
    description: '選択図形を回転',
    usage: [
      'ドラッグ: 図形を回転',
      'Shift+ドラッグ: 15°単位に固定'
    ]
  },
  'add-path-point': {
    name: 'ポイント追加',
    shortcut: '+',
    description: 'パスにポイントを追加',
    usage: [
      'パス上をクリック: 直線ポイント追加',
      'Shift+クリック: ベジェポイント追加',
      'ホバーで挿入位置を表示'
    ]
  },
  'delete-path-point': {
    name: 'ポイント削除',
    shortcut: '-',
    description: 'パスからポイントを削除',
    usage: [
      'アンカーポイントをクリック: ポイント削除',
      'ホバーでプレビュー（赤ハイライト）',
      '開始点(M)は削除不可'
    ]
  }
};

/**
 * Get help info for a tool
 */
export function getToolHelp(tool: ToolType): ToolHelpInfo {
  return toolHelp[tool];
}

/**
 * Get help text for status bar (all usage items joined)
 */
export function getToolShortHelp(tool: ToolType): string {
  const help = toolHelp[tool];
  return help.usage.join(' | ') || help.description;
}

/**
 * Get tooltip text for tool button
 */
export function getToolTooltip(tool: ToolType): string {
  const help = toolHelp[tool];
  const shortcut = help.shortcut ? ` (${help.shortcut})` : '';
  const usageText = help.usage.join(' | ');
  return `${help.name}${shortcut}\n${usageText}`;
}
