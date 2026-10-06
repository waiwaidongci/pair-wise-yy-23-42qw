export const mockData = {
  "brailleSymbol": [
    {
      "id": 1,
      "cell_pattern": "cell pattern 1",
      "letter": "letter 1",
      "pinyin": "pinyin 1",
      "category": "TEXT_TO_CELL",
      "difficulty": "difficulty 1",
      "audio_hint_key": "audio hint key 1"
    },
    {
      "id": 2,
      "cell_pattern": "cell pattern 2",
      "letter": "letter 2",
      "pinyin": "pinyin 2",
      "category": "LISTENING",
      "difficulty": "difficulty 2",
      "audio_hint_key": "audio hint key 2"
    },
    {
      "id": 3,
      "cell_pattern": "cell pattern 3",
      "letter": "letter 3",
      "pinyin": "pinyin 3",
      "category": "MIXED",
      "difficulty": "difficulty 3",
      "audio_hint_key": "audio hint key 3"
    }
  ],
  "lesson": [
    {
      "id": 1,
      "title": "title 1",
      "symbol_ids": [
        1,
        2
      ],
      "stage": "stage 1",
      "estimated_minutes": "estimated minutes 1",
      "unlock_rule": "unlock rule 1"
    },
    {
      "id": 2,
      "title": "title 2",
      "symbol_ids": [
        1,
        2
      ],
      "stage": "stage 2",
      "estimated_minutes": "estimated minutes 2",
      "unlock_rule": "unlock rule 2"
    },
    {
      "id": 3,
      "title": "title 3",
      "symbol_ids": [
        1,
        2
      ],
      "stage": "stage 3",
      "estimated_minutes": "estimated minutes 3",
      "unlock_rule": "unlock rule 3"
    }
  ],
  "practiceSession": [
    {
      "id": 1,
      "lesson_id": 1,
      "mode": "mode 1",
      "started_at": "2026-06-11T09:00:00Z",
      "finished_at": "2026-06-11T09:00:00Z",
      "score": "LOW",
      "mistake_count": "mistake count 1"
    },
    {
      "id": 2,
      "lesson_id": 2,
      "mode": "mode 2",
      "started_at": "2026-06-12T09:00:00Z",
      "finished_at": "2026-06-12T09:00:00Z",
      "score": "MEDIUM",
      "mistake_count": "mistake count 2"
    },
    {
      "id": 3,
      "lesson_id": 3,
      "mode": "mode 3",
      "started_at": "2026-06-13T09:00:00Z",
      "finished_at": "2026-06-13T09:00:00Z",
      "score": "HIGH",
      "mistake_count": "mistake count 3"
    }
  ],
  "answerRecord": [
    {
      "id": 1,
      "session_id": 1,
      "symbol_id": 1,
      "user_answer": "user answer 1",
      "correct": "correct 1",
      "latency_ms": "latency ms 1",
      "mistake_reason": "mistake reason 1"
    },
    {
      "id": 2,
      "session_id": 2,
      "symbol_id": 2,
      "user_answer": "user answer 2",
      "correct": "correct 2",
      "latency_ms": "latency ms 2",
      "mistake_reason": "mistake reason 2"
    },
    {
      "id": 3,
      "session_id": 3,
      "symbol_id": 3,
      "user_answer": "user answer 3",
      "correct": "correct 3",
      "latency_ms": "latency ms 3",
      "mistake_reason": "mistake reason 3"
    }
  ]
} as const;
