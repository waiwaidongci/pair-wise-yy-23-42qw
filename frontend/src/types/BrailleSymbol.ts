export interface BrailleSymbol {
  id: number;
  cell_pattern: string;
  letter: string;
  pinyin: string;
  category: string;
  difficulty: string;
  audio_hint_key: string;
  /** 内容版本：老师每次保存递增，练习会话据此判定快照是否失效 */
  version: number;
  updated_at: string;
}
