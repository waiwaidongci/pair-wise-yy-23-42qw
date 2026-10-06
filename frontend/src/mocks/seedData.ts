export const mockData = {
  "brailleSymbol": [
    {
      "id": 1,
      "cell_pattern": "⠁",
      "letter": "A",
      "pinyin": "a",
      "category": "LETTER",
      "difficulty": "1",
      "audio_hint_key": "a",
      "version_hash": "",
      "updated_at": "2026-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "cell_pattern": "⠃",
      "letter": "B",
      "pinyin": "b",
      "category": "LETTER",
      "difficulty": "1",
      "audio_hint_key": "b",
      "version_hash": "",
      "updated_at": "2026-01-01T00:00:00Z"
    },
    {
      "id": 3,
      "cell_pattern": "⠉",
      "letter": "C",
      "pinyin": "c",
      "category": "LETTER",
      "difficulty": "2",
      "audio_hint_key": "c",
      "version_hash": "",
      "updated_at": "2026-01-01T00:00:00Z"
    },
    {
      "id": 4,
      "cell_pattern": "⠙",
      "letter": "D",
      "pinyin": "d",
      "category": "LETTER",
      "difficulty": "2",
      "audio_hint_key": "d",
      "version_hash": "",
      "updated_at": "2026-01-01T00:00:00Z"
    },
    {
      "id": 5,
      "cell_pattern": "⠑",
      "letter": "E",
      "pinyin": "e",
      "category": "LETTER",
      "difficulty": "3",
      "audio_hint_key": "e",
      "version_hash": "",
      "updated_at": "2026-01-01T00:00:00Z"
    },
    {
      "id": 6,
      "cell_pattern": "⠿",
      "letter": "全符",
      "pinyin": "quan",
      "category": "CONTRACTION",
      "difficulty": "3",
      "audio_hint_key": "quan",
      "version_hash": "",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ],
  "lesson": [
    {
      "id": 1,
      "title": "入门字母 A-C",
      "symbol_ids": [1, 2, 3],
      "stage": "入门",
      "estimated_minutes": 10,
      "unlock_rule": "完成前置课程",
      "version_hash": "",
      "updated_at": "2026-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "title": "进阶字母 D-E",
      "symbol_ids": [3, 4, 5],
      "stage": "进阶",
      "estimated_minutes": 15,
      "unlock_rule": "完成入门字母",
      "version_hash": "",
      "updated_at": "2026-01-01T00:00:00Z"
    },
    {
      "id": 3,
      "title": "综合练习",
      "symbol_ids": [1, 2, 3, 4, 5, 6],
      "stage": "综合",
      "estimated_minutes": 20,
      "unlock_rule": "完成进阶字母",
      "version_hash": "",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ],
  "practiceSession": [],
  "answerRecord": []
} as const;
