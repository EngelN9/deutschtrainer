# 德語 B1–C2 AI 自學 App：完整產品與技術規格

你是一位資深產品架構師、全端工程師、React Native 工程師、資料庫工程師、AI 應用工程師 及軟體測試工程師。

請協助我規劃並逐步開發一個專門提供德語自學的跨平台行動 App。此 App 面向繁體中文使 用者，程度範圍限定為：

- 德語 B1

- 德語 B2

- 德語 C1

- 德語 C2

本產品不是單純模仿 Duolingo，而是要建立一套以德語實際能力、繁體中文文法解釋、AI 錯 誤診斷、間隔複習、寫作訓練、聽力訓練及口說訓練為核心的學習系統。

請嚴格依照以下規格進行規劃及開發。

一、產品目標

本產品的核心目標如下：

1. 協助繁體中文使用者從德語 B1 持續學習至 C2。

2. 提供結構化的 B1、B2、C1、C2 課程路徑。

3. 診斷中文母語者常見的德語錯誤。

4. 使用 AI 提供具體、可理解且符合程度的錯誤解釋。

5. 提供單字、文法、閱讀、聽力、寫作及口說訓練。

6. 根據使用者表現建立個人化複習排程。

7. 讓使用者清楚知道自己在哪些技能上進步或退步。

8. 提供接近真實情境的德語溝通任務。

9. 在 C1、C2 階段加強正式寫作、論證、摘要、改寫、語域及高階閱讀能力。

10. 所有課程內容及 AI 回饋皆須支援繁體中文介面。

- 二、目標使用者

# 主要使用者為：

- 已完成德語 A2，準備進入 B1 的學習者。

- 正在準備 Goethe、telc、ÖSD 或其他德語能力檢定的學習者。

- 希望提升德語工作、留學、移民或學術能力的使用者。

- 希望獲得繁體中文德語文法解釋的學習者。

- 已達 B2 或 C1，但希望提升正式表達及接近母語程度的學習者。 第一版不提供 A1、A2 課程。

# 三、產品定位

本產品的主要差異化功能為：

1. 專門提供德語 B1 至 C2。

2. 針對繁體中文母語者設計。

3. AI 錯誤分類，而不只是顯示正確答案。

4. 德語文法錯誤的繁體中文解釋。

5. 根據錯誤自動產生針對性補強練習。

6. 提供句子層級及文章層級的批改。

7. 支援正式與非正式語域判斷。

8. 支援德國、奧地利及瑞士德語差異標記，但預設以德國標準德語為主。

9. 依 CEFR 程度限制使用的單字、句型及任務複雜度。

10. 以技能掌握度而不是單純經驗值評估學習成效。

# 四、技術架構

- 4.1 行動 App

# 使用：

- React Native

- Expo

- TypeScript

- Expo Router

- React Hook Form

- Zod

- TanStack Query

- Zustand

# 要求：

- 啟用 TypeScript strict mode。

- 使用函式元件及 React Hooks。

- 不使用已棄用的 React Native API。

- 頁面、商業邏輯及資料存取必須分離。

- 不得在畫面元件中直接呼叫資料庫。

- 所有外部資料必須有 loading、empty、error 及 retry 狀態。

- 所有表單必須進行前端及後端驗證。

- 支援 Android 及 iOS。

- 第一版優先確保 Android 可正常執行。

# 4.2 Web 管理後台

# 使用：

- Next.js

- TypeScript

- React

- Supabase

- Zod

- TanStack Query

# 管理後台用途：

- 建立及編輯課程。

- 建立及編輯單元。

- 建立及編輯課堂內容。

- 管理單字及文法主題。

- 建立及審核題目。

- 審核 AI 產生的題目。

- 管理音訊資源。

- 查看題目錯誤率。

- 查看使用者匿名化學習統計。

- 管理內容版本。

- 發布或撤回課程。

# 4.3 後端

# 使用：

- Supabase PostgreSQL

- Supabase Auth

- Supabase Storage

- Supabase Edge Functions，或獨立 Node.js 後端

- Row Level Security

- OpenAI API

# 後端負責：

- 使用者登入及身分驗證。

- 課程資料查詢。

- 答題紀錄。

# - 學習進度計算。

- 複習排程。

- AI 評分及錯誤解釋。

- AI 題目生成。

- 音訊生成及語音轉文字。

- API 使用量限制。

- AI 成本紀錄。

- 安全日誌。

- 敏感資料保護。

# 4.4 AI 相關服務

AI 功能必須透過後端呼叫，不可從 App 前端直接呼叫。

# 使用：

- OpenAI Responses API

- Structured Outputs

- JSON Schema

- Speech-to-Text

- Text-to-Speech

- Realtime API，僅於後期語音對話階段使用

# 所有 AI 回傳資料必須經過：

1. JSON Schema 驗證。

# 2. Zod 驗證。

# 3. 程度限制檢查。

4. 禁止內容檢查。

# 5. 資料完整性檢查。

# 6. 失敗時的重試及降級處理。

# 五、使用者角色

系統至少包含以下角色：

# 5.1 學習者

可以：

- 選擇學習程度。

- 完成課程。

- 作答。

- 查看錯誤解釋。

- 進行複習。

- 提交作文。

- 使用口說及聽力功能。

- 查看個人學習進度。

# 5.2 內容編輯者

可以：

- 新增及編輯課程內容。

- 建立題目。

- 編輯文法說明。

- 上傳音訊。

- 編輯答案。

- 建立內容草稿。

# 5.3 審核者

可以：

- 審核人工內容。

- 審核 AI 產生內容。

- 核准或拒絕題目。

- 標記內容錯誤。

- 檢查程度是否符合 CEFR。

# 5.4 系統管理員

可以：

- 管理使用者角色。

- 查看系統狀態。

- 管理課程發布。

- 查看 AI 成本。

- 查看錯誤日誌。

- 停用有問題的功能或內容。

# 六、程度架構

所有內容必須具有以下程度之一：

B1

B2

C1

C2

每個程度必須具有不同的學習目標。

# 6.1 B1

# 重點：

- 日常生活溝通。

- 描述經驗。

- 說明原因。

- 表達簡單意見。

- 處理旅行及生活情境。

- 撰寫簡單正式或半正式訊息。

- 理解清楚且標準的日常德語。

# 文法範圍包括：

- 主句及從句語序。

- weil、dass、wenn、obwohl。

- 關係子句。

- 完成式及常用過去式。

- 第二虛擬式基本用法。

- 被動式基本用法。

- 不定詞加 zu。

- 第三格及第四格。

- 雙向介系詞。

- 形容詞詞尾變化。

- 可分動詞。

- 反身動詞。

- 6.2 B2

# 重點：

- 理解較複雜文章。

- 表達抽象意見。

- 進行論證。

- 說明優缺點。

- 撰寫正式電子郵件及短篇議論文。

- 理解一般新聞及訪談。

- 與母語者進行較自然的互動。

# 文法及表達範圍包括：

- 複雜從句。

- 被動式不同時態。

- 進階第二虛擬式。

- 分詞作形容詞。

- 名詞化表達。

- 動詞與介系詞搭配。

- 進階連接詞。

- 間接引語基礎。

- 正式書面語。

- 論證及反駁句型。

# 6.3 C1

# 重點：

- 理解長篇及高密度文章。

- 理解隱含意義。

- 流暢且有組織地表達複雜內容。

- 撰寫正式報告、論述及摘要。

- 根據情境調整語域。

- 處理專業、學術及社會議題。

# 內容包括：

- 學術及正式詞彙。

- 進階名詞化。

- 複雜句法結構。

- 間接引語。

- 高階連接結構。

- 摘要及改寫。

- 多來源資訊整合。

- 正式口頭簡報。

- 精確表達立場。

- 語氣及細微語意差異。

# 6.4 C2

# 重點：

- 理解幾乎所有形式的德語。

- 整合多來源資訊。

- 精確表達細微語意差異。

- 靈活使用正式、學術、專業及口語語域。

- 撰寫高度連貫且風格成熟的文章。

- 辨識修辭、諷刺、暗示及文化語境。

# 內容包括：

- 高階語用學。

- 修辭技巧。

- 風格分析。

- 諷刺及隱喻。

- 專業及學術文本。

- 複雜論證。

- 批判性閱讀。

- 高階摘要及綜合。

- 精細語域轉換。

- 接近母語程度的編輯及改寫。

# 七、課程階層

# 課程必須採用以下結構：

Level

└── Course

└── Unit

└── Lesson

└── Activity └── Exercise

# 定義：

- Level：B1、B2、C1、C2。

- Course：該程度中的主要課程。

- Unit：主題單元。

- Lesson：單一明確學習目標。

- Activity：教學、練習、複習、測驗或任務。

- Exercise：實際題目。

每堂 Lesson 必須只包含一至三個主要學習目標。

# 八、課程內容分類

# 每個程度至少包含以下能力類別：

vocabulary

grammar

reading

listening

writing

speaking

interaction

mediation

pronunciation

exam_preparation

其中 mediation 指：

- 摘要內容。

- 向另一人轉述資訊。

- 用簡單或不同程度的語言解釋內容。

- 整合不同來源的資訊。

# 九、主題規劃

# 9.1 B1 主題

- 日常生活

- 家庭與人際關係

- 住宅與租屋

- 購物與服務

- 健康與醫療

- 旅行與交通

- 工作與求職

- 教育與學習

- 媒體與科技

- 環境與社會生活

- 表達意見

- 正式與非正式電子郵件

# 9.2 B2 主題

- 職場溝通

- 經濟與消費

- 新聞與媒體

- 教育制度

- 科技與社會

- 環境與永續

- 文化與藝術

- 健康政策

- 社會議題

- 優缺點分析

- 論證及反駁

- 正式書面表達

# 9.3 C1 主題

- 學術閱讀

- 專業溝通

- 社會科學

- 科學與研究

- 政治與公共政策

- 經濟與全球化

- 哲學及倫理

- 跨文化溝通

- 新聞評論

- 摘要及改寫

- 論文式寫作

- 口頭簡報

# 9.4 C2 主題

- 高階文學閱讀

- 修辭及風格分析

- 學術論證

- 法律與制度文本

- 高階媒體論述

- 諷刺、隱喻及暗示

- 多來源綜合

- 專業編輯

- 高階辯論

- 文化及歷史語境

- 精細語域控制

- 接近母語程度的表達

- 十、Lesson 標準結構

# 每堂課可包含：

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

# 每堂課必須提供：

- 標題。

- 程度。

- 技能分類。

- 預估完成時間。

- 先備技能。

- 學習目標。

- 單字標籤。

- 文法標籤。

- CEFR 能力描述。

- 發布狀態。

- 內容版本。

十一、題型規格

# 第一階段支援：

multiple_choice

multiple_select

fill_blank

sentence_order

matching

translation

dictation

error_correction

reading_comprehension

listening_comprehension free_response

# 第二階段支援：

speaking

conversation

essay

summary

paraphrase

argumentation

mediation

oral_presentation

每一種 Exercise 必須使用 TypeScript discriminated union。 範例：

type Exercise =

| MultipleChoiceExercise

| MultipleSelectExercise

| FillBlankExercise

| SentenceOrderExercise

| MatchingExercise

| TranslationExercise

| DictationExercise

| ErrorCorrectionExercise

| ReadingComprehensionExercise

| ListeningComprehensionExercise

| FreeResponseExercise

| SpeakingExercise

| ConversationExercise

| EssayExercise

| SummaryExercise

| ParaphraseExercise

| ArgumentationExercise

| MediationExercise;

所有題目共同欄位至少包含：

interface BaseExercise {

id: string;

level: "B1" | "B2" | "C1" | "C2"; type: ExerciseType;

title: string;

instructionZhTw: string;

promptDe: string;

skillIds: string[];

grammarTopicIds: string[];

vocabularyIds: string[];

estimatedSeconds: number;

difficulty: number;

sourceType: "human" | "ai_generated" | "ai_assisted";

reviewStatus: "draft" | "pending_review" | "approved" | "rejected";

version: number;

}

# 十二、固定評分與 AI 評分

# 12.1 由程式固定評分

# 適用：

# - 單選題。

- 複選題。

- 配對題。

- 句子排序。

- 固定答案填空。

- 聽寫中的精確文字比對。

- 文法形式變化。

# 固定評分系統須支援：

- 大小寫容錯。

- 前後空白清除。

- 德語特殊字元正規化。

- 可接受多個標準答案。

- 可設定是否忽略標點。

- 可設定部分得分。

- 可設定同義答案。

# 12.2 由 AI 評分

適用：

- 翻譯。

- 自由造句。

- 作文。

- 摘要。

- 改寫。

- 論證。

- 情境對話。

- 口說轉錄內容。

- C1、C2 高階輸出任務。

AI 不得只回傳一段自由文字，必須使用固定 JSON Schema。

# 範例：

{

"isCorrect": false,

"score": 76,

"cefrLevelEstimate": "B2",

"correctedText": "Obwohl die Maßnahme teuer ist, könnte sie langfristig Vorteile bringen.", "errors": [

{

"type": "word_order",

"severity": "major",

"original": "obwohl die Maßnahme ist teuer",

"correction": "obwohl die Maßnahme teuer ist",

"explanationZhTw": "obwohl 引導從句時，變位動詞應置於句尾。",

"relatedSkillId": "B1.word_order.subordinate_clause"

}

],

"strengths": [

"論點清楚",

"連接詞使用方向正確"

],

"suggestions": [

"練習讓步從句的動詞位置"

],

"naturalAlternative": "Trotz der hohen Kosten könnte die Maßnahme langfristig von Vorteil sein.",

"requiresHumanReview": false

}

十三、AI 錯誤分類

至少支援以下錯誤類型：

spelling

capitalization

punctuation

article

gender

case

declension adjective_ending

verb_conjugation

tense

auxiliary word_order

subordinate_clause preposition verb_preposition

pronoun relative_clause passive_voice subjunctive collocation word_choice register coherence

cohesion

argumentation

task_completion

style

idiomaticity redundancy

ambiguity

pronunciation

fluency

# 錯誤必須具有嚴重程度：

minor

moderate

major

critical

# 錯誤記錄必須可以關聯至：

- 技能。

- 文法主題。

- 單字。

- 題目。

- 課堂。

- 使用者。

- 複習排程。

# 十四、技能系統

# 技能代碼應採階層化命名，例如：

B1.word_order.subordinate_clause B1.case.dative

B1.case.accusative

B1.preposition.two_way

B1.writing.informal_email B1.writing.formal_email

B2.argumentation.advantages_disadvantages

B2.argumentation.counterargument

B2.register.formal

B2.listening.news_interview

C1.writing.academic_summary

C1.writing.source_integration

C1.speaking.formal_presentation

C1.register.academic

C2.pragmatics.irony

C2.style.rhetorical_effect

C2.writing.advanced_synthesis

C2.register.flexible_shift

# 每個 Skill 至少包含：

- id

- code

- nameZhTw

- nameDe

- descriptionZhTw

- level

- category

- prerequisiteSkillIds

- masteryThreshold

- reviewPolicy

# 十五、學習進度與掌握度

# 每名使用者對每項技能必須保存：

masteryScore

confidenceScore

attemptCount

correctCount

incorrectCount

hintCount

averageResponseTime

lastPracticedAt

nextReviewAt

correctStreak

incorrectStreak

lastErrorTypes

"masteryScore" 建議範圍為：

0–100

初步規則：

- 0–39：尚未掌握。

- 40–59：初步理解。

- 60–74：部分掌握。

- 75–89：穩定掌握。

- 90–100：高度掌握。

答對不一定代表完全掌握。

# 掌握度計算應考慮：

- 是否使用提示。

- 作答時間。

- 題目難度。

- 最近錯誤。

- 連續正確次數。

- 間隔一段時間後是否仍能答對。

- 自由回答品質。

# 十六、間隔複習

建立 "review_queue"。

# 每個複習項目至少包含：

userId

skillId

exerciseId

priority

scheduledAt

reason

intervalDays

easeFactor

status

# 初期可以使用簡化規則：

- 完全錯誤：同日再次複習。

- 使用提示後答對：1 天後。

- 正確但速度慢：3 天後。

- 正確且穩定：7 天後。

- 多次穩定正確：14 天後。

- 長期穩定：30 天後。

- 再次答錯：縮短間隔。

後期可加入類似 SM-2 或自訂記憶模型。

AI 可生成相似題目，但複習時間由程式決定。

十七、單字系統

每個單字至少包含：

lemma

partOfSpeech

gender

plural

principalParts

separablePrefix

reflexive

governingCase

requiredPreposition

level

frequencyRank

definitionsZhTw

exampleSentences

collocations

synonyms

antonyms

register

region

audioUrl

支援：

- 名詞性別。

- 複數。

- 動詞三態。

- 動詞搭配介系詞。

- 反身動詞。

- 可分動詞。

- 常見搭配。

- 正式及非正式標記。

- 德國、奧地利、瑞士差異。

十八、文法系統

每個 GrammarTopic 至少包含：

titleZhTw

titleDe

level

shortExplanationZhTw

fullExplanationZhTw

rules

examples

commonMistakes

relatedSkillIds

# prerequisiteTopicIds

每個文法主題必須包含：

- 繁體中文解釋。

- 德語例句。

- 正確及錯誤對照。

- 中文母語者常見錯誤。

- 相關練習。

- 難度等級。

- 先備知識。

十九、作文批改

- 作文類型包括：

# B1

- 非正式電子郵件。

- 簡單正式電子郵件。

- 經驗描述。

- 意見表達。

# B2

- 正式信件。

- 投訴信。

- 優缺點文章。

- 論證短文。

- 論壇文章。

C1

- 摘要。

- 正式報告。

- 學術式論述。

- 多來源整合。

- 結構化評論。

C2

- 高階議論文。

- 風格轉換。

- 批判性評論。

- 專業編輯。

- 高階摘要及綜合。

- 修辭及語氣調整。

# 評分面向：

task_completion

grammar

vocabulary

coherence

cohesion

register

argumentation

style

accuracy

idiomaticity

# 批改流程：

1. 顯示原文。

2. 標示錯誤位置。

3. 顯示錯誤類型。

4. 提供繁體中文說明。

5. 提供修改建議。

6. 不立即完全改寫整篇。

7. 要求使用者先自行修改。

8. 第二次提交後再提供完整參考版本。

9. 保存版本差異。

10. 記錄重複錯誤。

# 二十、AI 對話系統

# 情境包括：

- 租屋。

- 看醫生。

- 求職面試。

- 公司會議。

- 銀行及行政機關。

- 大學及研究環境。

- 正式辯論。

- 學術討論。

- 問題協商。

- 專業簡報問答。

# 每個對話場景須定義：

level

scenario

userRole

aiRole

learningObjectives

allowedVocabulary

targetGrammar maximumTurns

feedbackFrequency correctionStyle register

successCriteria

# 糾錯模式：

immediate

after_three_turns

after_conversation

user_requested

# 預設不應每句打斷使用者。 對話完成後提供：

- 任務完成度。

- 主要錯誤。

- 自然表達建議。

- 使用過的目標單字。

- 尚未使用的目標句型。

- 下一次建議練習。

二十一、聽力系統

支援：

- 單句聽寫。

- 短對話。

- 公告。

- 訪談。

- 新聞。

- 演講。

- 學術內容。

- 多人討論。

功能包括：

- 正常速度。

- 慢速播放。

- 重複播放。

- 逐字稿。

- 關鍵單字提示。

- 聽力理解題。

- 逐字差異比對。

必須記錄：

- 播放次數。

- 是否使用慢速。

- 是否查看逐字稿。

- 答題結果。

- 困難單字。

二十二、口說系統

第一階段功能：

- 使用者錄音。

- 語音轉文字。

- 與目標句比較。

- 顯示漏字及多字。

- 計算語速。

- 顯示停頓位置。

- 提供重錄建議。

第二階段功能：

- 自由口說。

- 情境回答。

- 即時 AI 對話。

- 口頭簡報。

- 高階辯論。

系統不得將語音辨識結果直接宣稱為精確發音評分。 口說回饋須區分：

- 內容正確性。

- 文法。

- 流暢度。

- 語速。

- 停頓。

- 可理解度。

- 發音疑似問題。

- 二十三、閱讀系統 閱讀材料包括：

B1

- 生活訊息。

- 短篇文章。

- 電子郵件。

- 公告。

- 簡易新聞。

# B2

- 新聞文章。

- 評論。

- 訪談。

- 報告節錄。

- 論壇文章。

# C1

- 學術文章。

- 深度評論。

- 專業報告。

- 社會科學文本。

- 複雜長文。

C2

- 文學文本。

- 法律或政策文本。

- 高階論述。

- 多層次修辭文章。

- 諷刺及隱含意義文本。

題型包括：

- 主旨。

- 細節。

- 推論。

- 作者態度。

- 字義推測。

- 文章結構。

- 修辭效果。

- 多來源比較。

二十四、資料庫資料表 至少建立以下資料表：

profiles

user_preferences

user_levels

courses

units

lessons

activities

skills

skill_prerequisites

grammar_topics

vocabulary

vocabulary_examples

exercises

exercise_options exercise_answers

exercise_skill_links

attempts

attempt_answers error_records skill_mastery review_queue lesson_progress

course_progress

writing_submissions writing_versions ai_feedback

conversation_scenarios conversation_sessions conversation_messages speaking_submissions listening_assets

audio_assets

content_versions

content_reviews

ai_generation_jobs

ai_usage_logs

feature_flags

audit_logs

# 每張資料表都必須具有：

- 主鍵。

- 建立時間。

- 修改時間。

- 必要的外鍵。

- 適當的索引。

- 資料驗證。

- RLS 規則。

- 軟刪除策略，如適用。

二十五、主要 TypeScript 資料模型 至少建立：

UserProfile

UserPreferences

Course

Unit

Lesson

Activity

Skill

GrammarTopic VocabularyItem Exercise

ExerciseOption ExerciseAnswer Attempt

AttemptAnswer ErrorRecord SkillMastery ReviewItem WritingSubmission

AIFeedback

ConversationScenario

ConversationSession

SpeakingSubmission

AudioAsset

ContentVersion

所有 API 的 request 及 response 都必須有獨立型別及 Zod Schema。 不得直接將資料庫 row 型別當作 UI ViewModel。

二十六、主要 App 頁面

未登入區

- 歡迎頁。

- 功能介紹頁。

- 登入頁。

- 註冊頁。

- 忘記密碼頁。

初次設定

- 選擇目前程度。

- 選擇目標程度。

- 選擇每日學習時間。

- 選擇學習目標。

- 程度測驗入口。

- 音訊及通知權限說明。

主要頁面

- 首頁。

- 今日學習。

- 課程地圖。

- 單元列表。

- 課堂內容。

- 題目作答。

- 答題結果。

- 錯題說明。

- 每日複習。

- 單字庫。

- 文法庫。

- 作文中心。

- AI 對話。

- 聽力中心。

- 口說中心。

- 模擬測驗。

- 學習分析。

- 個人設定。

二十七、首頁規格

首頁顯示：

- 今日學習目標。

- 建議繼續課程。

- 到期複習數量。

- 本週學習時間。

- 目前程度。

- 目標程度。

- 弱項技能。

- 最近錯誤類型。

- 每日任務。

不得只顯示經驗值。

二十八、學習分析頁

顯示：

- 各技能掌握度。

- 文法弱項。

- 單字掌握度。

- 閱讀正確率。

- 聽力正確率。

- 寫作常見錯誤。

- 口說活動次數。

- 最近 7 天及 30 天趨勢。

- B1、B2、C1、C2 各程度完成比例。

- 建議補強課程。

# 圖表必須具有可存取的文字替代資訊。

二十九、通知系統

# 通知類型：

- 每日學習提醒。

- 到期複習提醒。

- 連續多日未學習提醒。

- 作文批改完成。

- 新課程發布。

- 學習目標完成。

# 要求：

- 使用者可關閉。

- 不得過度通知。

- 保存通知偏好。

- 支援時區。

# 三十、離線功能

第一版至少支援：

- 已下載課程離線閱讀。

- 固定題型離線作答。

- 本地保存作答紀錄。

- 連線恢復後同步。

離線時不支援：

- AI 作文批改。

- AI 對話。

- 語音辨識。

- 即時題目生成。

同步必須避免重複紀錄。

# 三十一、安全性

# 要求：

1. 不得在 App 中保存 OpenAI API 金鑰。

2. 不得將 Supabase service role key 放在前端。

3. 啟用 Row Level Security。

4. 使用者只能讀寫自己的學習紀錄。

5. 課程發布資料可公開讀取，但草稿不可公開。

6. 管理員功能必須檢查角色。

7. 所有輸入必須驗證。

8. 限制 AI API 呼叫頻率。

9. 防止提示詞注入影響系統指令。

10. AI 不得任意讀取其他使用者資料。

11. 音訊及作文資料需具有清楚的保存及刪除政策。

# 12. 日誌中不得記錄密碼、Token 或完整敏感內容。

13. 提供刪除帳號及刪除個人資料功能。

# 14. 提供資料匯出機制。

15. 管理員操作必須寫入 audit log。

# 三十二、AI 成本控制

# 每次 AI 呼叫必須記錄：

userId

feature

model

inputTokens

outputTokens

estimatedCost

latency

success

errorCode

createdAt

# 成本控制策略：

- 固定題型不使用 AI。

- 相同題目解釋可以快取。

- 對話限制最大輪數。

- 作文限制字數。

- 免費使用者限制每日 AI 次數。

- 重複請求使用 idempotency key。

- AI 失敗時使用預設錯誤說明。

- 管理後台顯示每日及每月成本。

三十三、內容品質控制

所有內容狀態：

draft

pending_review

approved

published rejected archived

# AI 生成內容不得直接發布。

AI 題目生成流程：

1. 編輯者指定程度、主題、技能及題型。

2. AI 生成草稿。

3. 自動執行 Schema 驗證。

4. 自動檢查答案一致性。

5. 自動檢查是否超出程度。

6. 自動檢查重複題目。

7. 人工審核。

8. 核准後發布。

# 內容必須支援版本控制及回復舊版本。

三十四、測試要求

- 34.1 單元測試

# 測試：

- 評分函式。

- 答案正規化。

- 掌握度計算。

- 複習排程。

- Zod Schema。

- AI 回傳解析。

- 權限判斷。

- 成本計算。

# 34.2 元件測試

# 使用：

- Jest

- React Native Testing Library

# 測試：

- 題目元件。

- 表單驗證。

- Loading 狀態。

- Error 狀態。

- 無障礙標籤。

- 作答互動。

# 34.3 整合測試

# 測試：

- 登入。

- 課程載入。

- 提交答案。

- 更新進度。

- 建立複習項目。

- 提交作文。

- AI 回饋失敗及成功流程。

# 34.4 端對端測試

可使用 Maestro 或 Detox。

# 至少測試：

# 1. 使用者註冊。

2. 選擇 B1 程度。

3. 開啟課程。

4. 完成五題。

5. 查看結果。

6. 錯題進入複習。

7. 登出及重新登入。

8. 確認進度仍存在。

# 三十五、程式碼品質

# 要求：

- ESLint。

- Prettier。

- TypeScript strict。

- Husky。

- lint-staged。

- Conventional Commits。

- GitHub Actions。

- 測試覆蓋率報告。

- 禁止未處理的 Promise。

- 禁止使用 "any"，除非附有明確註解。

- 核心商業邏輯不得寫在 UI 元件。

- 每個模組具有 README 或文件。

- 公開函式具有 JSDoc。

- 不要過度抽象化。

- 優先使用可讀、可測試的程式碼。

三十六、無障礙及介面要求

- 所有按鈕具有 accessibilityLabel。

- 支援螢幕閱讀器。

- 不以顏色作為唯一狀態提示。

- 文字大小可調整。

- 德語長字不得超出畫面。

- 支援深色模式。

- 錄音功能必須顯示明確狀態。

- 音訊必須具有文字稿。

- 錯誤提示須清楚且不羞辱使用者。

- 介面語言第一版為繁體中文。

- 德語內容不可被自動翻譯成簡體中文。

三十七、非功能需求

# 效能

- 主要頁面首次顯示應盡量少於 2 秒。

- 長列表使用虛擬化。

- 音訊採用快取。

- 避免不必要重新渲染。

- API 支援分頁。

- 資料庫建立必要索引。

# 可靠性

- 所有提交操作須避免重複提交。

- AI 請求支援 timeout。

- 網路失敗可重試。

- 關鍵資料使用交易。

- 使用者進度不可因 App 關閉而遺失。

# 可維護性

- 功能模組化。

- 資料庫 migration 必須納入版本控制。

- API 有明確契約。

- AI prompt 存放於獨立版本化模組。

- 不在程式碼中散落 prompt 字串。

三十八、第一階段 MVP

第一階段不要一次完成 B1 至 C2 全部內容。

系統架構必須支援 B1、B2、C1、C2，但 MVP 內容先建立：

- B1 一個完整單元。

- B2 一個示範單元。

- C1 一個示範課堂。

- C2 一個示範課堂。

- 約 100 至 150 題人工核准題目。

- 固定題型評分。

- AI 自由回答批改。

- 錯題紀錄。

- 間隔複習。

- 基本學習分析。

- 德語文字轉語音。

- 登入及跨裝置進度同步。

MVP 暫不包含：

- 排行榜。

- 好友系統。

- 虛擬貨幣。

- 商店。

- 公會。

- 複雜動畫。

- 即時多人功能。

- 訂閱付款。

- C2 大量完整課程。

- 完整即時語音對話。

三十九、開發階段

Phase 0：文件及架構

# 建立：

docs/product-requirements.md

docs/user-stories.md

docs/architecture.md

docs/database-schema.md docs/security.md docs/exercise-types.md docs/ai-integration.md

docs/ai-output-schemas.md docs/content-model.md

docs/testing-strategy.md

docs/development-roadmap.md docs/acceptance-criteria.md

# 驗收條件：

- 文件之間沒有矛盾。

- B1、B2、C1、C2 均被資料模型支援。

- 所有主要資料表已定義。

- 所有主要 API 已列出。

- 所有 AI 輸出已定義 JSON Schema。

- 已列出主要技術風險。

Phase 1：專案基礎

# 完成：

- Expo 專案。

- Next.js 管理後台。

- Supabase 本地開發環境。

- TypeScript strict。

- ESLint。

- Prettier。

- Jest。

- GitHub Actions。

- 環境變數範例。

- 基本資料夾結構。

# 驗收條件：

- App 可啟動。

- Web 後台可啟動。

- lint 通過。

- typecheck 通過。

- 測試通過。

- CI 通過。

# Phase 2：帳號及導覽

# 完成：

- 註冊。

- 登入。

- 登出。

- 忘記密碼。

- 初次設定。

- 程度選擇。

- Expo Router 導覽。

# 驗收條件：

- 使用者只能查看自己的資料。

- 未登入使用者不可進入主要 App。

- 登入狀態可保存。

# Phase 3：課程及題目

# 完成：

- 課程地圖。

- 單元列表。

- 課堂頁。

- 題目播放器。

- 固定題型。

- 假資料及 Supabase 資料切換。

# 驗收條件：

- B1、B2、C1、C2 資料均可正確顯示。

- 不同題型可正常提交。

- 重新開啟 App 後進度仍存在。

# Phase 4：學習紀錄

# 完成：

- Attempt。

- SkillMastery。

- LessonProgress。

- ReviewQueue。

- 錯題頁。

- 學習分析。

# 驗收條件：

- 答題後自動更新技能掌握度。

- 答錯後建立複習項目。

- 到期複習可正確顯示。

# Phase 5：AI 批改

# 完成：

- 自由回答批改。

- 翻譯批改。

- 錯誤分類。

- Structured Outputs。

- 失敗重試。

- 快取。

- 成本紀錄。

# 驗收條件：

- AI 回傳格式永遠經過驗證。

- 錯誤時 App 不會崩潰。

- 使用者看到繁體中文解釋。

- AI 金鑰不出現在前端。

# Phase 6：作文

# 完成：

- 作文提交。

- 版本保存。

- 行內錯誤標示。

- 分項評分。

- 重寫流程。

# 驗收條件：

- 原文不被覆蓋。

- 每次修改都有版本。

- 使用者可比較兩個版本。

Phase 7：音訊及口說

完成：

- TTS。

- 音訊播放器。

- 錄音。

- Speech-to-Text。

- 聽寫。

- 基本口說回饋。

# 驗收條件：

- 音訊權限處理完整。

- 拒絕權限時有替代流程。

- 錄音可刪除。

- 音訊不會被其他使用者讀取。

# Phase 8：管理後台

# 完成：

- 課程管理。

- 題目管理。

- 審核流程。

- 內容版本。

- AI 生成草稿。

- 發布流程。

# 驗收條件：

- AI 內容不得直接發布。

- 非管理員不可進入管理功能。

- 所有發布操作寫入 audit log。

# 四十、資料夾結構

# 請提出並建立類似以下的 monorepo 結構：

apps/

mobile/

admin/

api/

packages/

shared-types/

validation/

ui/

grading/

learning-engine/

ai-schemas/

ai-prompts/

database/

config/

supabase/

migrations/

seed/

functions/

docs/

tests/

若選擇不同結構，必須說明原因。

# 四十一、API 規格

# 至少規劃：

GET /courses

GET /courses/:courseId

GET /lessons/:lessonId

POST /attempts

- GET /users/me/progress

- GET /users/me/reviews

POST /reviews/:reviewId/complete

POST /ai/evaluate-response

- POST /ai/evaluate-writing

- POST /ai/generate-practice

- POST /audio/text-to-speech

POST /audio/transcribe

POST /conversations

POST /conversations/:id/messages

每個 API 必須定義：

- request schema。

- response schema。

- 權限。

- 錯誤代碼。

- Rate limit。

- 是否可快取。

- 是否需要 idempotency key。

四十二、錯誤處理

建立統一錯誤格式：

{

"error": {

"code": "AI_RESPONSE_INVALID", "message": "無法解析 AI 回應。",

"retryable": true,

"requestId": "..."

}

}

錯誤類型至少包含：

VALIDATION_ERROR

UNAUTHORIZED

FORBIDDEN

NOT_FOUND

RATE_LIMITED

NETWORK_ERROR

DATABASE_ERROR

AI_TIMEOUT

AI_RESPONSE_INVALID

AUDIO_UPLOAD_FAILED

CONTENT_NOT_PUBLISHED

前端不得直接顯示伺服器 stack trace。

四十三、種子資料

建立 seed data：

- B1 一個單元，至少五堂課。

- B2 一個示範單元，至少兩堂課。

- C1 一堂示範課。

- C2 一堂示範課。

- 至少二十個 Skill。

- 至少十個 GrammarTopic。

- 至少五十個 VocabularyItem。

- 至少五十題 Exercise。

Seed data 必須：

- 可重複執行。

- 不建立重複資料。

- 標示為測試或示範內容。

- 不含受著作權保護的教材內容。

四十四、法律及內容限制

- 不複製 Duolingo 的角色、圖像、音效、題目或介面。

- 不使用未授權的教材內容。

- 所有示範文章及題目應自行編寫或使用可合法使用的資料。

- 音訊須記錄來源及授權狀態。

- 使用者上傳內容須具有刪除機制。

- AI 回饋頁須說明 AI 可能出錯。

- 高階 C1、C2 內容應提供人工審核機制。

四十五、Codex 工作方式

請不要一次產生整個 App。

每一階段請依照以下流程：

1. 先閱讀現有文件及程式碼。

2. 列出此階段要完成的項目。

3. 列出將修改或建立的檔案。

4. 實作功能。

5. 執行 lint。

6. 執行 typecheck。

7. 執行測試。

8. 修正錯誤。

9. 檢查安全性。

# 10. 更新文件。

11. 回報已完成項目。

12. 回報尚未完成項目。

# 13. 回報已知限制。

14. 提供人工驗收步驟。

不要在沒有測試的情況下宣稱功能完成。

不要任意修改與當前任務無關的檔案。

不要刪除現有功能，除非規格明確要求。

若發現規格衝突，請記錄於：

docs/decisions/

並建立 Architecture Decision Record。

# 四十六、第一個任務

第一個任務只完成規劃文件，不要直接建立完整功能。

# 請依序完成：

1. 建立 monorepo 的建議架構。

2. 建立 "docs/product-requirements.md"。

3. 建立 "docs/user-stories.md"。

4. 建立 "docs/architecture.md"。

5. 建立 "docs/database-schema.md"。

6. 建立 "docs/exercise-types.md"。

7. 建立 "docs/content-model.md"。

8. 建立 "docs/ai-integration.md"。

9. 建立 "docs/ai-output-schemas.md"。

10. 建立 "docs/security.md"。

11. 建立 "docs/testing-strategy.md"。

12. 建立 "docs/development-roadmap.md"。

13. 建立 "docs/acceptance-criteria.md"。

14. 建立 "docs/open-questions.md"。

15. 建立 "docs/risks.md"。

# 完成後執行一致性檢查，確認：

- B1、B2、C1、C2 都被完整支援。

- 課程結構與資料庫結構一致。

- Exercise 型別與資料表一致。

- AI JSON Schema 與 TypeScript 型別一致。

- 行動 App 與後端 API 規格一致。

- 權限規則與使用者角色一致。

- 每個開發階段都有可測量的驗收條件。

- 第一版範圍沒有加入排行榜、付款或社交系統。

# 最後請輸出：

1. 已建立的文件清單。

2. 建議的專案資料夾結構。

3. 主要架構決策。

4. 尚待決定的產品問題。

# 5. 主要風險。

6. 建議從哪一個開發階段開始。

7. 下一個適合交給 Codex 的明確任務。

# 在完成上述文件及一致性檢查以前，不要開始大量實作 App 頁面。
