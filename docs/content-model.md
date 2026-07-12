# Content Model

## 1. 課程階層

系統固定採用：

```text
Level
  Course
    Unit
      Lesson
        Activity
          Exercise
```

- Level：B1、B2、C1、C2。
- Course：該程度中的主要課程。
- Unit：主題單元。
- Lesson：單一明確學習目標。
- Activity：教學、練習、複習、測驗或任務。
- Exercise：實際題目。

每堂 Lesson 必須只包含一至三個主要學習目標。

## 2. Lesson 必要欄位

- title
- level
- skill categories
- estimated minutes
- prerequisite skill ids
- learning objectives
- vocabulary tags
- grammar tags
- CEFR descriptor
- publish status
- content version

## 3. Lesson 標準結構

每堂課可包含：

1. 學習目標。
2. 情境導入。
3. 核心單字。
4. 文法或表達說明。
5. 範例。
6. 引導練習。
7. 自主練習。
8. 聽力或閱讀內容。
9. 自由輸出任務。
10. AI 回饋。
11. 課堂總結。
12. 課後複習排程。

## 4. 能力類別

每個程度至少支援：

- vocabulary
- grammar
- reading
- listening
- writing
- speaking
- interaction
- mediation
- pronunciation
- exam_preparation

mediation 包含摘要、轉述、用不同程度語言解釋內容、多來源整合。

## 5. 程度與主題

### B1

日常生活、家庭與人際、住宅與租屋、購物與服務、健康與醫療、旅行與交通、工作與求職、教育與學習、媒體與科技、環境與社會生活、表達意見、正式與非正式電子郵件。

### B2

職場溝通、經濟與消費、新聞與媒體、教育制度、科技與社會、環境與永續、文化與藝術、健康政策、社會議題、優缺點分析、論證及反駁、正式書面表達。

### C1

學術閱讀、專業溝通、社會科學、科學與研究、政治與公共政策、經濟與全球化、哲學及倫理、跨文化溝通、新聞評論、摘要及改寫、論文式寫作、口頭簡報。

### C2

高階文學閱讀、修辭及風格分析、學術論證、法律與制度文本、高階媒體論述、諷刺、隱喻及暗示、多來源綜合、專業編輯、高階辯論、文化及歷史語境、精細語域控制。

## 6. Skill

Skill 採階層化命名，例如：

- B1.word_order.subordinate_clause
- B1.case.dative
- B1.preposition.two_way
- B2.argumentation.counterargument
- B2.register.formal
- C1.writing.academic_summary
- C1.register.academic
- C2.pragmatics.irony
- C2.register.flexible_shift

每個 Skill 至少包含 id、code、nameZhTw、nameDe、descriptionZhTw、level、category、prerequisiteSkillIds、masteryThreshold、reviewPolicy。

## 7. GrammarTopic

每個文法主題包含繁體中文解釋、德語例句、正確與錯誤對照、中文母語者常見錯誤、相關練習、難度、先備知識。

必要欄位：

- titleZhTw
- titleDe
- level
- shortExplanationZhTw
- fullExplanationZhTw
- rules
- examples
- commonMistakes
- relatedSkillIds
- prerequisiteTopicIds

## 8. VocabularyItem

每個單字包含：

- lemma
- partOfSpeech
- gender
- plural
- principalParts
- separablePrefix
- reflexive
- governingCase
- requiredPreposition
- level
- frequencyRank
- definitionsZhTw
- exampleSentences
- collocations
- synonyms
- antonyms
- register
- region
- audioUrl

需支援名詞性別、複數、動詞三態、介系詞搭配、反身、可分、搭配、正式與非正式、德國/奧地利/瑞士差異。

## 9. 內容狀態與版本

內容狀態：

- draft
- pending_review
- approved
- published
- rejected
- archived

AI 生成內容不得直接 published。所有內容更新建立 content_versions，審核建立 content_reviews。

## 10. AI 生成題目流程

1. 編輯者指定程度、主題、技能與題型。
2. AI 生成草稿。
3. 自動執行 Schema 驗證。
4. 自動檢查答案一致性。
5. 自動檢查是否超出程度。
6. 自動檢查重複題目。
7. 人工審核。
8. 核准後發布。

## 11. Seed Data

MVP seed 需可重複執行且不得建立重複資料：

- B1 一個單元，至少五堂課。
- B2 一個示範單元，至少兩堂課。
- C1 一堂示範課。
- C2 一堂示範課。
- 至少 20 個 Skill。
- 至少 10 個 GrammarTopic。
- 至少 50 個 VocabularyItem。
- 至少 50 題 Exercise。

所有示範內容需標示為測試或示範內容，且不含受著作權保護的教材。
