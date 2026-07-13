insert into public.feature_flags (key, description, enabled)
values
  ('ai_evaluation_enabled', 'Enable AI evaluation endpoints for controlled environments.', false),
  ('offline_attempt_sync_enabled', 'Enable offline attempt sync queue.', false)
on conflict (key) do update
set
  description = excluded.description,
  enabled = excluded.enabled,
  updated_at = now();

do $phase3_seed$
begin

insert into public.courses (
  id,
  level,
  title_zh_tw,
  title_de,
  description_zh_tw,
  status,
  version,
  published_at
)
values
  (
    md5('deutschtrainer:course:b1')::uuid,
    'B1',
    '日常獨立溝通',
    'Selbstständig im Alltag',
    '示範課程：練習在居住、健康、求職與意見表達情境中清楚溝通。',
    'published',
    1,
    now()
  ),
  (
    md5('deutschtrainer:course:b2')::uuid,
    'B2',
    '職場論證與表達',
    'Argumentieren im Berufsleben',
    '示範課程：組織論點、比較觀點並掌握正式職場語域。',
    'published',
    1,
    now()
  ),
  (
    md5('deutschtrainer:course:c1')::uuid,
    'C1',
    '學術摘要與立場',
    'Akademische Positionen',
    '示範課程：理解學術論述、壓縮資訊並精確呈現作者立場。',
    'published',
    1,
    now()
  ),
  (
    md5('deutschtrainer:course:c2')::uuid,
    'C2',
    '語體、修辭與言外之意',
    'Stil, Rhetorik und Implikatur',
    '示範課程：辨識反諷、語域轉換與細緻的語用效果。',
    'published',
    1,
    now()
  )
on conflict (id) do update
set
  title_zh_tw = excluded.title_zh_tw,
  title_de = excluded.title_de,
  description_zh_tw = excluded.description_zh_tw,
  status = excluded.status,
  version = excluded.version,
  published_at = excluded.published_at,
  updated_at = now(),
  deleted_at = null;

insert into public.units (
  id,
  course_id,
  title_zh_tw,
  title_de,
  description_zh_tw,
  order_index,
  status,
  version
)
values
  (
    md5('deutschtrainer:unit:b1-alltag')::uuid,
    md5('deutschtrainer:course:b1')::uuid,
    '單元 1：在德語環境中處理日常事務',
    'Alltag sicher bewältigen',
    '從說明原因、租屋、就醫到求職與表達意見。',
    0,
    'published',
    1
  ),
  (
    md5('deutschtrainer:unit:b2-argumentation')::uuid,
    md5('deutschtrainer:course:b2')::uuid,
    '示範單元：有條理地論證與協作',
    'Strukturiert argumentieren und kooperieren',
    '在工作及公共議題中比較、讓步、反駁與提出建議。',
    0,
    'published',
    1
  ),
  (
    md5('deutschtrainer:unit:c1-academic')::uuid,
    md5('deutschtrainer:course:c1')::uuid,
    '示範單元：學術資訊處理',
    'Akademische Informationen verarbeiten',
    '辨識研究主張、限制與證據，並產出精確摘要。',
    0,
    'published',
    1
  ),
  (
    md5('deutschtrainer:unit:c2-style')::uuid,
    md5('deutschtrainer:course:c2')::uuid,
    '示範單元：語言的細緻效果',
    'Feine sprachliche Wirkungen',
    '從語境辨識反諷、含蓄評價與語域轉換。',
    0,
    'published',
    1
  )
on conflict (id) do update
set
  course_id = excluded.course_id,
  title_zh_tw = excluded.title_zh_tw,
  title_de = excluded.title_de,
  description_zh_tw = excluded.description_zh_tw,
  order_index = excluded.order_index,
  status = excluded.status,
  version = excluded.version,
  updated_at = now(),
  deleted_at = null;

drop table if exists public._phase3_exercise_seed;
drop table if exists public._phase3_lesson_seed;
drop table if exists public._phase5_ai_exercise_seed;
drop table if exists public._phase6_writing_prompt_seed;

create table public._phase3_lesson_seed (
  slug text primary key,
  unit_slug text not null,
  level public.cefr_level not null,
  order_index integer not null,
  title_zh_tw text not null,
  title_de text not null,
  estimated_minutes integer not null,
  skill_categories public.skill_category[] not null,
  skill_ids text[] not null,
  learning_objectives text[] not null,
  vocabulary_tags text[] not null,
  grammar_tags text[] not null,
  cefr_descriptor text not null,
  mc_prompt text not null,
  mc_options jsonb not null,
  mc_answer_key text not null,
  multi_prompt text not null,
  multi_options jsonb not null,
  multi_answer_keys text[] not null,
  fill_prompt text not null,
  fill_answers text[] not null,
  order_segments text[] not null,
  matching_pairs jsonb,
  error_prompt text not null,
  error_answers text[] not null,
  error_explanation text not null
);

insert into public._phase3_lesson_seed values
  (
    'b1-gruende',
    'b1-alltag',
    'B1',
    0,
    '說明原因與讓步',
    'Gründe und Gegensätze ausdrücken',
    18,
    array['grammar', 'interaction']::public.skill_category[],
    array['B1.word_order.subordinate_clause', 'B1.interaction.giving_reasons'],
    array['使用 weil 與 obwohl 說明原因及讓步', '在從句中將變位動詞放在句末'],
    array['obwohl', 'deshalb', 'trotzdem'],
    array['weil / obwohl', '從句動詞末位'],
    '能以簡單連貫的語句說明理由，並表達對比或讓步。',
    'Ich bleibe zu Hause, ___ es stark regnet.',
    '[{"key":"a","textDe":"weil","textZhTw":"因為"},{"key":"b","textDe":"deshalb","textZhTw":"因此"},{"key":"c","textDe":"trotzdem","textZhTw":"儘管如此"},{"key":"d","textDe":"denn","textZhTw":"因為（並列）"}]',
    'a',
    'Welche Sätze haben eine korrekte Nebensatzstellung?',
    '[{"key":"a","textDe":"Ich gehe früh schlafen, weil ich morgen arbeiten muss."},{"key":"b","textDe":"Obwohl er müde ist, lernt er weiter."},{"key":"c","textDe":"Ich bleibe hier, weil ich muss warten."},{"key":"d","textDe":"Obwohl regnet es, gehen wir spazieren."}]',
    array['a', 'b'],
    'Obwohl er müde ist, ___ er weiter.',
    array['arbeitet'],
    array['Ich bleibe zu Hause,', 'weil', 'es heute regnet.'],
    '[{"left":"weil","right":"nennt einen Grund"},{"left":"obwohl","right":"drückt einen Gegensatz aus"},{"left":"deshalb","right":"nennt eine Folge"}]',
    'Ich bleibe zu Hause, weil es regnet stark.',
    array['Ich bleibe zu Hause, weil es stark regnet.'],
    'weil 引導從句，變位動詞 regnet 必須放在句末。'
  ),
  (
    'b1-wohnung',
    'b1-alltag',
    'B1',
    1,
    '租屋與位置變化',
    'Wohnungssuche und Ortswechsel',
    20,
    array['vocabulary', 'grammar']::public.skill_category[],
    array['B1.case.dative', 'B1.preposition.two_way'],
    array['依移動或位置選擇三格與四格', '理解租屋常見詞彙與搭配'],
    array['die Miete', 'die Kaution', 'der Mietvertrag'],
    array['雙向介系詞', '三格名詞變化'],
    '能理解租屋資訊，並描述物品的位置及移動方向。',
    'Ich hänge das Bild ___ die Wand.',
    '[{"key":"a","textDe":"an","textZhTw":"到牆上"},{"key":"b","textDe":"auf"},{"key":"c","textDe":"bei"},{"key":"d","textDe":"von"}]',
    'a',
    'Welche Sätze verwenden den Kasus korrekt?',
    '[{"key":"a","textDe":"Das Bild hängt an der Wand."},{"key":"b","textDe":"Ich stelle den Stuhl neben das Sofa."},{"key":"c","textDe":"Die Lampe steht auf den Tisch."},{"key":"d","textDe":"Wir helfen der Nachbar."}]',
    array['a', 'b'],
    'Wir helfen ___ Nachbarn beim Umzug.',
    array['dem'],
    array['Ich interessiere mich', 'für', 'die helle Wohnung.'],
    '[{"left":"die Miete","right":"monatlicher Preis der Wohnung"},{"left":"die Kaution","right":"hinterlegte Sicherheit"},{"left":"der Mietvertrag","right":"schriftliche Vereinbarung"}]',
    'Ich helfe den Nachbar beim Umzug.',
    array['Ich helfe dem Nachbarn beim Umzug.'],
    'helfen 要求三格；陽性弱變化名詞 Nachbar 在三格單數為 dem Nachbarn。'
  ),
  (
    'b1-gesundheit',
    'b1-alltag',
    'B1',
    2,
    '預約看診與描述症狀',
    'Arzttermine und Beschwerden',
    18,
    array['interaction', 'vocabulary']::public.skill_category[],
    array['B1.interaction.appointment', 'B1.vocabulary.health'],
    array['以禮貌方式預約或更改看診時間', '使用身體部位與時間表達描述症狀'],
    array['die Beschwerden', 'der Termin', 'seit gestern'],
    array['禮貌請求', 'seit + 三格'],
    '能在看診情境中交換必要資訊並清楚說明常見症狀。',
    'Ich ___ gern einen Termin für morgen vereinbaren.',
    '[{"key":"a","textDe":"möchte"},{"key":"b","textDe":"muss"},{"key":"c","textDe":"werde"},{"key":"d","textDe":"hätte"}]',
    'a',
    'Welche Formulierungen sind für eine höfliche Terminvereinbarung geeignet?',
    '[{"key":"a","textDe":"Wäre am Donnerstag noch ein Termin frei?"},{"key":"b","textDe":"Könnten Sie mir bitte einen Termin geben?"},{"key":"c","textDe":"Du gibst mir morgen einen Termin."},{"key":"d","textDe":"Ich will sofort drankommen."}]',
    array['a', 'b'],
    'Ich habe seit gestern ___ Kopfschmerzen.',
    array['starke'],
    array['Könnten Sie mir bitte', 'einen Termin', 'für Freitag geben?'],
    '[{"left":"die Kopfschmerzen","right":"Schmerzen im Kopf"},{"left":"der Husten","right":"Reizung der Atemwege"},{"left":"das Rezept","right":"ärztliche Verordnung"}]',
    'Mir tut die Rücken weh.',
    array['Mir tut der Rücken weh.'],
    'Rücken 是陽性單數主詞，因此冠詞使用 der，動詞維持單數 tut。'
  ),
  (
    'b1-bewerbung',
    'b1-alltag',
    'B1',
    3,
    '撰寫簡短求職信',
    'Eine kurze Bewerbung schreiben',
    22,
    array['writing', 'exam_preparation']::public.skill_category[],
    array['B1.writing.formal_email', 'B1.register.formal'],
    array['使用正式稱謂及結尾', '以常見搭配說明申請動機'],
    array['sich bewerben um', 'der Lebenslauf', 'die Stelle'],
    array['正式信件格式', '反身動詞搭配'],
    '能撰寫簡短、連貫且符合基本格式的正式電子郵件。',
    'Welche Grußformel passt zu einer formellen Bewerbung?',
    '[{"key":"a","textDe":"Mit freundlichen Grüßen"},{"key":"b","textDe":"Bis dann"},{"key":"c","textDe":"Liebe Grüße"},{"key":"d","textDe":"Ciao"}]',
    'a',
    'Welche Formulierungen passen in eine formelle Bewerbung?',
    '[{"key":"a","textDe":"Hiermit bewerbe ich mich um die ausgeschriebene Stelle."},{"key":"b","textDe":"Über eine Einladung freue ich mich sehr."},{"key":"c","textDe":"Der Job klingt echt cool."},{"key":"d","textDe":"Meld dich einfach bei mir."}]',
    array['a', 'b'],
    'Hiermit ___ ich mich um die Stelle als Kundenberater.',
    array['bewerbe'],
    array['Über eine Einladung', 'zu einem persönlichen Gespräch', 'würde ich mich sehr freuen.'],
    '[{"left":"der Lebenslauf","right":"Übersicht über Ausbildung und Erfahrung"},{"left":"das Anschreiben","right":"Begründung der Bewerbung"},{"left":"das Zeugnis","right":"Nachweis einer Leistung"}]',
    'Ich interessiere mich auf die ausgeschriebene Stelle.',
    array['Ich interessiere mich für die ausgeschriebene Stelle.'],
    'sich interessieren 固定搭配 für + 四格，不使用 auf。'
  ),
  (
    'b1-meinung',
    'b1-alltag',
    'B1',
    4,
    '表達意見與比較觀點',
    'Meinungen vergleichen',
    20,
    array['interaction', 'writing']::public.skill_category[],
    array['B1.interaction.opinion', 'B1.writing.connectors'],
    array['清楚標示個人立場', '使用一方面／另一方面比較兩個觀點'],
    array['meiner Meinung nach', 'einerseits', 'andererseits'],
    array['句子連接詞', '意見表達'],
    '能就熟悉議題簡要說明自己的立場，並提出支持理由。',
    '___ ist Homeoffice praktisch, aber der direkte Austausch fehlt.',
    '[{"key":"a","textDe":"Einerseits"},{"key":"b","textDe":"Obwohl"},{"key":"c","textDe":"Wegen"},{"key":"d","textDe":"Damit"}]',
    'a',
    'Welche Ausdrücke markieren eine persönliche Meinung?',
    '[{"key":"a","textDe":"Meiner Meinung nach ..."},{"key":"b","textDe":"Ich bin der Ansicht, dass ..."},{"key":"c","textDe":"Zum Beispiel ..."},{"key":"d","textDe":"Danach ..."}]',
    array['a', 'b'],
    'Meiner Meinung ___ sollten Städte mehr Radwege bauen.',
    array['nach'],
    array['Einerseits spart man Zeit,', 'andererseits', 'fehlt der persönliche Kontakt.'],
    '[{"left":"einerseits","right":"erster Gesichtspunkt"},{"left":"andererseits","right":"zweiter, gegensätzlicher Gesichtspunkt"},{"left":"außerdem","right":"zusätzliches Argument"}]',
    'Ich bin dafür, weil das ist praktisch.',
    array['Ich bin dafür, weil das praktisch ist.'],
    'weil 引導從句，變位動詞 ist 要移到句末。'
  ),
  (
    'b2-argumente',
    'b2-argumentation',
    'B2',
    0,
    '建立論點、讓步與反駁',
    'Argumente abwägen und entkräften',
    24,
    array['writing', 'interaction']::public.skill_category[],
    array['B2.argumentation.counterargument', 'B2.writing.cohesion'],
    array['使用讓步結構引入反方觀點', '以連接詞建立清楚的論證關係'],
    array['zwar ... aber', 'hingegen', 'demgegenüber'],
    array['讓步結構', '篇章銜接'],
    '能有系統地發展論點，凸顯重要觀點並回應相反意見。',
    'Die Maßnahme ist ___ teuer, langfristig aber sinnvoll.',
    '[{"key":"a","textDe":"zwar"},{"key":"b","textDe":"sowohl"},{"key":"c","textDe":"weder"},{"key":"d","textDe":"deswegen"}]',
    'a',
    'Welche Sätze formulieren ein Gegenargument sachlich?',
    '[{"key":"a","textDe":"Dagegen lässt sich einwenden, dass die Kosten unterschätzt werden."},{"key":"b","textDe":"Dieses Argument überzeugt nur teilweise, weil aktuelle Daten fehlen."},{"key":"c","textDe":"Das ist einfach Unsinn."},{"key":"d","textDe":"Wer das glaubt, hat keine Ahnung."}]',
    array['a', 'b'],
    'Die erste Lösung spart Zeit; die zweite ist ___ deutlich günstiger.',
    array['hingegen'],
    array['Zwar verursacht die Umstellung zunächst Kosten,', 'langfristig', 'senkt sie jedoch den Energieverbrauch.'],
    null,
    'Zwar ist die Lösung teuer, sondern sie bleibt langfristig sinnvoll.',
    array['Zwar ist die Lösung teuer, aber sie bleibt langfristig sinnvoll.'],
    'zwar 搭配 aber 或 jedoch；sondern 用於否定後的更正。'
  ),
  (
    'b2-arbeitsplatz',
    'b2-argumentation',
    'B2',
    1,
    '正式職場溝通',
    'Formell am Arbeitsplatz kommunizieren',
    22,
    array['interaction', 'writing']::public.skill_category[],
    array['B2.register.formal', 'B2.interaction.negotiation'],
    array['依情境選擇正式且合作的語氣', '在郵件中精確提出請求與替代方案'],
    array['bezüglich', 'Rücksprache halten', 'einen Vorschlag unterbreiten'],
    array['名詞化語體', '間接請求'],
    '能在專業情境中清楚交換複雜資訊，並維持合宜的正式語域。',
    'Welche Formulierung ist für eine formelle Rückfrage am geeignetsten?',
    '[{"key":"a","textDe":"Könnten Sie bitte erläutern, welche Frist maßgeblich ist?"},{"key":"b","textDe":"Was soll die Frist denn heißen?"},{"key":"c","textDe":"Sag mal schnell, bis wann das sein muss."},{"key":"d","textDe":"Keine Ahnung, erklär das."}]',
    'a',
    'Welche Formulierungen wirken kooperativ und professionell?',
    '[{"key":"a","textDe":"Gern schlage ich als Alternative den kommenden Montag vor."},{"key":"b","textDe":"Bitte teilen Sie mir mit, ob dieser Termin für Sie möglich ist."},{"key":"c","textDe":"Das ist nicht mein Problem."},{"key":"d","textDe":"Sie müssen den Termin eben ändern."}]',
    array['a', 'b'],
    '___ Ihrer Anfrage habe ich intern Rücksprache gehalten.',
    array['Bezüglich'],
    array['Nach Rücksprache mit dem Team', 'möchte ich Ihnen', 'folgenden Vorschlag unterbreiten.'],
    null,
    'Ich freue mich, wenn Sie könnten mir bis Freitag antworten.',
    array['Ich würde mich freuen, wenn Sie mir bis Freitag antworten könnten.'],
    '在 wenn 從句中，情態動詞 könnten 位於句末；主句使用 würde 顯得較正式委婉。'
  ),
  (
    'c1-zusammenfassung',
    'c1-academic',
    'C1',
    0,
    '摘要研究主張與限制',
    'Forschungspositionen präzise zusammenfassen',
    28,
    array['reading', 'mediation', 'writing']::public.skill_category[],
    array['C1.writing.academic_summary', 'C1.reading.author_stance'],
    array['區分研究結果、推論與限制', '以中性語氣壓縮並重組資訊'],
    array['die Befundlage', 'einschränkend', 'daraus ableiten'],
    array['報導式虛擬一式', '學術名詞化'],
    '能理解長篇複雜文本的隱含立場，並以結構清楚的方式摘要重要資訊。',
    'Die Aussage gilt nur ___, als die Stichprobe repräsentativ ist.',
    '[{"key":"a","textDe":"insofern"},{"key":"b","textDe":"indem"},{"key":"c","textDe":"obgleich"},{"key":"d","textDe":"anstatt"}]',
    'a',
    'Welche Formulierungen geben eine Forschungsposition neutral wieder?',
    '[{"key":"a","textDe":"Die Autorin kommt zu dem Schluss, dass ..."},{"key":"b","textDe":"Der Studie zufolge lässt sich ..."},{"key":"c","textDe":"Offensichtlich ist diese Theorie völlig falsch."},{"key":"d","textDe":"Zum Glück beweist der Artikel endlich ..."}]',
    array['a', 'b'],
    'Zusammenfassend ___ sich festhalten, dass weitere Daten erforderlich sind.',
    array['lässt'],
    array['Die Untersuchung weist zwar auf einen Zusammenhang hin,', 'lässt jedoch', 'keinen eindeutigen Kausalschluss zu.'],
    null,
    'Die Autoren behaupten, die Ergebnisse sind auf alle Gruppen übertragbar.',
    array['Die Autoren behaupten, die Ergebnisse seien auf alle Gruppen übertragbar.'],
    '在中性轉述未經說話者背書的主張時，正式書面語常用第一虛擬式 seien。'
  ),
  (
    'c2-ironie',
    'c2-style',
    'C2',
    0,
    '辨識反諷與語域轉換',
    'Ironie und Registerwechsel erkennen',
    30,
    array['reading', 'mediation', 'interaction']::public.skill_category[],
    array['C2.pragmatics.irony', 'C2.register.flexible_shift'],
    array['從語境與措辭辨識反諷', '說明語域轉換產生的修辭效果'],
    array['mitnichten', 'vermeintlich', 'augenzwinkernd'],
    array['語用預設', '語域轉換'],
    '能輕鬆理解幾乎所有文本，辨識細微的風格差異、暗示及言外之意。',
    'Welches Wort verstärkt eine entschieden verneinende, gehobene Aussage?',
    '[{"key":"a","textDe":"mitnichten"},{"key":"b","textDe":"vielleicht"},{"key":"c","textDe":"irgendwie"},{"key":"d","textDe":"sowieso"}]',
    'a',
    'Welche Hinweise können in einem passenden Kontext Ironie signalisieren?',
    '[{"key":"a","textDe":"eine auffällige Übertreibung"},{"key":"b","textDe":"ein Widerspruch zwischen Wortlaut und Situation"},{"key":"c","textDe":"jede Verwendung eines Fachbegriffs"},{"key":"d","textDe":"jede höfliche Anrede"}]',
    array['a', 'b'],
    'Die Reform war ___ der große Wurf, als den man sie verkauft hatte.',
    array['mitnichten'],
    array['Was als nüchterne Analyse beginnt,', 'kippt unvermittelt', 'in demonstrativ saloppe Polemik.'],
    null,
    'Die vermeintlich brillante Lösung war tatsächlich ein Erfolg, obwohl sie vollständig scheiterte.',
    array['Die vermeintlich brillante Lösung war tatsächlich kein Erfolg, da sie vollständig scheiterte.'],
    'vermeintlich 標示表面評價與事實落差；後句需在語意上維持此反諷方向。'
  );

insert into public.lessons (
  id,
  unit_id,
  level,
  title_zh_tw,
  title_de,
  order_index,
  estimated_minutes,
  skill_categories,
  prerequisite_skill_ids,
  learning_objectives,
  vocabulary_tags,
  grammar_tags,
  cefr_descriptor,
  status,
  version
)
select
  md5('deutschtrainer:lesson:' || slug)::uuid,
  md5('deutschtrainer:unit:' || unit_slug)::uuid,
  level,
  title_zh_tw,
  title_de,
  order_index,
  estimated_minutes,
  skill_categories,
  case when order_index = 0 then '{}'::text[] else array[skill_ids[1]] end,
  learning_objectives,
  vocabulary_tags,
  grammar_tags,
  cefr_descriptor,
  'published',
  1
from public._phase3_lesson_seed
on conflict (id) do update
set
  unit_id = excluded.unit_id,
  level = excluded.level,
  title_zh_tw = excluded.title_zh_tw,
  title_de = excluded.title_de,
  order_index = excluded.order_index,
  estimated_minutes = excluded.estimated_minutes,
  skill_categories = excluded.skill_categories,
  prerequisite_skill_ids = excluded.prerequisite_skill_ids,
  learning_objectives = excluded.learning_objectives,
  vocabulary_tags = excluded.vocabulary_tags,
  grammar_tags = excluded.grammar_tags,
  cefr_descriptor = excluded.cefr_descriptor,
  status = excluded.status,
  version = excluded.version,
  updated_at = now(),
  deleted_at = null;

insert into public.activities (
  id,
  lesson_id,
  type,
  title_zh_tw,
  order_index,
  content_json,
  status,
  version
)
select
  md5('deutschtrainer:activity:' || slug)::uuid,
  md5('deutschtrainer:lesson:' || slug)::uuid,
  'practice',
  '理解與固定題型練習',
  0,
  jsonb_build_object(
    'summaryZhTw', '以繁體中文提示搭配德語例句，完成六種固定評分題型。',
    'isDemoContent', true
  ),
  'published',
  1
from public._phase3_lesson_seed
on conflict (id) do update
set
  lesson_id = excluded.lesson_id,
  type = excluded.type,
  title_zh_tw = excluded.title_zh_tw,
  order_index = excluded.order_index,
  content_json = excluded.content_json,
  status = excluded.status,
  version = excluded.version,
  updated_at = now(),
  deleted_at = null;

create table public._phase3_exercise_seed as
select
  slug || '-mc' as slug,
  slug as lesson_slug,
  level,
  'multiple_choice'::public.exercise_type as type,
  title_zh_tw || '：單選' as title,
  '選出最適合空格或情境的答案。' as instruction_zh_tw,
  mc_prompt as prompt_de,
  '{}'::jsonb as payload_json,
  mc_options as options_json,
  jsonb_build_object('optionKey', mc_answer_key) as answer_json,
  skill_ids,
  grammar_tags as grammar_topic_ids,
  vocabulary_tags as vocabulary_ids,
  35 as estimated_seconds,
  case level when 'B1' then 2 when 'B2' then 3 when 'C1' then 4 else 5 end as difficulty,
  0 as order_index,
  '請對照句型功能與語境。' as explanation_zh_tw
from public._phase3_lesson_seed
union all
select
  slug || '-multi',
  slug,
  level,
  'multiple_select'::public.exercise_type,
  title_zh_tw || '：複選',
  '選出所有正確或合宜的句子。',
  multi_prompt,
  jsonb_build_object('requireAllCorrect', false),
  multi_options,
  jsonb_build_object('optionKeys', to_jsonb(multi_answer_keys)),
  skill_ids,
  grammar_tags,
  vocabulary_tags,
  55,
  case level when 'B1' then 2 when 'B2' then 3 when 'C1' then 4 else 5 end,
  1,
  '複選題會依正確選項比例給予部分分數；錯選會抵銷部分得分。'
from public._phase3_lesson_seed
union all
select
  slug || '-fill',
  slug,
  level,
  'fill_blank'::public.exercise_type,
  title_zh_tw || '：填空',
  '在空格中輸入正確的德語字詞。',
  fill_prompt,
  '{}'::jsonb,
  '[]'::jsonb,
  jsonb_build_object('acceptedAnswers', to_jsonb(fill_answers)),
  skill_ids,
  grammar_tags,
  vocabulary_tags,
  45,
  case level when 'B1' then 2 when 'B2' then 3 when 'C1' then 4 else 5 end,
  2,
  '系統會忽略大小寫與句末標點，並支援常見德語字元替代。'
from public._phase3_lesson_seed
union all
select
  slug || '-order',
  slug,
  level,
  'sentence_order'::public.exercise_type,
  title_zh_tw || '：排序',
  '點選片段，排列成正確的德語句子。',
  'Ordne die Satzteile zu einem vollständigen Satz.',
  jsonb_build_object(
    'segments', (
      select jsonb_agg(
        jsonb_build_object('id', 'segment-' || ordinality, 'textDe', segment)
        order by ordinality
      )
      from unnest(order_segments) with ordinality as parts(segment, ordinality)
    ),
    'allowPartialCredit', true
  ),
  '[]'::jsonb,
  jsonb_build_object(
    'segmentIds', (
      select jsonb_agg('segment-' || ordinality order by ordinality)
      from unnest(order_segments) with ordinality as parts(segment, ordinality)
    )
  ),
  skill_ids,
  grammar_tags,
  vocabulary_tags,
  55,
  case level when 'B1' then 2 when 'B2' then 3 when 'C1' then 4 else 5 end,
  3,
  '排序時請留意連接詞、逗號與變位動詞的位置。'
from public._phase3_lesson_seed
union all
select
  slug || '-matching',
  slug,
  level,
  'matching'::public.exercise_type,
  title_zh_tw || '：配對',
  '將左側詞語與右側說明正確配對。',
  'Ordne jedem Ausdruck die passende Bedeutung zu.',
  jsonb_build_object(
    'leftItems', (
      select jsonb_agg(
        jsonb_build_object('id', 'left-' || ordinality, 'textDe', pair ->> 'left')
        order by ordinality
      )
      from jsonb_array_elements(matching_pairs) with ordinality as pairs(pair, ordinality)
    ),
    'rightItems', (
      select jsonb_agg(
        jsonb_build_object('id', 'right-' || ordinality, 'textDe', pair ->> 'right')
        order by ordinality desc
      )
      from jsonb_array_elements(matching_pairs) with ordinality as pairs(pair, ordinality)
    ),
    'allowPartialCredit', true
  ),
  '[]'::jsonb,
  jsonb_build_object(
    'pairs', (
      select jsonb_object_agg('left-' || ordinality, 'right-' || ordinality)
      from jsonb_array_elements(matching_pairs) with ordinality as pairs(pair, ordinality)
    )
  ),
  skill_ids,
  grammar_tags,
  vocabulary_tags,
  70,
  2,
  4,
  '先理解詞語功能，再根據定義完成配對。'
from public._phase3_lesson_seed
where matching_pairs is not null
union all
select
  slug || '-correction',
  slug,
  level,
  'error_correction'::public.exercise_type,
  title_zh_tw || '：改錯',
  '找出錯誤並輸入完整的正確句子。',
  error_prompt,
  '{}'::jsonb,
  '[]'::jsonb,
  jsonb_build_object('acceptedAnswers', to_jsonb(error_answers)),
  skill_ids,
  grammar_tags,
  vocabulary_tags,
  65,
  case level when 'B1' then 3 when 'B2' then 4 else 5 end,
  case when matching_pairs is null then 4 else 5 end,
  error_explanation
from public._phase3_lesson_seed;

insert into public.exercises (
  id,
  activity_id,
  level,
  type,
  title,
  instruction_zh_tw,
  prompt_de,
  payload_json,
  skill_ids,
  grammar_topic_ids,
  vocabulary_ids,
  estimated_seconds,
  difficulty,
  source_type,
  review_status,
  status,
  version,
  order_index
)
select
  md5('deutschtrainer:exercise:' || slug)::uuid,
  md5('deutschtrainer:activity:' || lesson_slug)::uuid,
  level,
  type,
  title,
  instruction_zh_tw,
  prompt_de,
  payload_json,
  skill_ids,
  grammar_topic_ids,
  vocabulary_ids,
  estimated_seconds,
  difficulty,
  'human',
  'approved',
  'published',
  1,
  order_index
from public._phase3_exercise_seed
on conflict (id) do update
set
  activity_id = excluded.activity_id,
  level = excluded.level,
  type = excluded.type,
  title = excluded.title,
  instruction_zh_tw = excluded.instruction_zh_tw,
  prompt_de = excluded.prompt_de,
  payload_json = excluded.payload_json,
  skill_ids = excluded.skill_ids,
  grammar_topic_ids = excluded.grammar_topic_ids,
  vocabulary_ids = excluded.vocabulary_ids,
  estimated_seconds = excluded.estimated_seconds,
  difficulty = excluded.difficulty,
  source_type = excluded.source_type,
  review_status = excluded.review_status,
  status = excluded.status,
  version = excluded.version,
  order_index = excluded.order_index,
  updated_at = now(),
  deleted_at = null;

delete from public.exercise_options
where exercise_id in (
  select md5('deutschtrainer:exercise:' || slug)::uuid from public._phase3_exercise_seed
);

insert into public.exercise_options (
  id,
  exercise_id,
  label,
  text_de,
  text_zh_tw,
  order_index,
  is_correct
)
select
  md5(
    'deutschtrainer:option:' || seed.slug || ':' || (option_value ->> 'key')
  )::uuid,
  md5('deutschtrainer:exercise:' || seed.slug)::uuid,
  upper(option_value ->> 'key'),
  option_value ->> 'textDe',
  option_value ->> 'textZhTw',
  option_order - 1,
  case
    when seed.type = 'multiple_choice' then option_value ->> 'key' = seed.answer_json ->> 'optionKey'
    when seed.type = 'multiple_select' then seed.answer_json -> 'optionKeys' ? (option_value ->> 'key')
    else false
  end
from public._phase3_exercise_seed seed
cross join lateral jsonb_array_elements(seed.options_json) with ordinality as options(option_value, option_order);

insert into public.exercise_answers (
  id,
  exercise_id,
  answer_json,
  grading_policy_json,
  explanation_zh_tw
)
select
  md5('deutschtrainer:answer:' || slug)::uuid,
  md5('deutschtrainer:exercise:' || slug)::uuid,
  case
    when type = 'multiple_choice' then jsonb_build_object(
      'optionId',
      md5('deutschtrainer:option:' || slug || ':' || (answer_json ->> 'optionKey'))::uuid::text
    )
    when type = 'multiple_select' then jsonb_build_object(
      'optionIds',
      (
        select jsonb_agg(
          md5('deutschtrainer:option:' || seed.slug || ':' || option_key)::uuid::text
          order by option_key
        )
        from jsonb_array_elements_text(seed.answer_json -> 'optionKeys') as keys(option_key)
      )
    )
    else answer_json
  end,
  jsonb_build_object(
    'caseSensitive', false,
    'ignorePunctuation', true,
    'normalizeGermanCharacters', true,
    'allowPartialCredit', type in ('multiple_select', 'sentence_order', 'matching'),
    'acceptedAlternatives', '[]'::jsonb
  ),
  explanation_zh_tw
from public._phase3_exercise_seed seed
on conflict (exercise_id) do update
set
  answer_json = excluded.answer_json,
  grading_policy_json = excluded.grading_policy_json,
  explanation_zh_tw = excluded.explanation_zh_tw,
  updated_at = now();

create table public._phase5_ai_exercise_seed (
  slug text primary key,
  lesson_slug text not null,
  level public.cefr_level not null,
  type public.exercise_type not null,
  title text not null,
  instruction_zh_tw text not null,
  prompt_de text not null,
  prompt_zh_tw text,
  skill_ids text[] not null,
  reference_answers_de text[] not null,
  grading_notes_zh_tw text not null,
  minimum_characters integer not null,
  maximum_characters integer not null
);

insert into public._phase5_ai_exercise_seed values
  (
    'b1-gruende-ai-translation',
    'b1-gruende',
    'B1',
    'translation',
    '讓步句翻譯',
    '將繁體中文句子翻譯成自然、完整的德語。',
    'Übersetze den folgenden Satz ins Deutsche.',
    '雖然今天下雨，我還是騎腳踏車上班。',
    array['B1.word_order.subordinate_clause'],
    array[
      'Obwohl es heute regnet, fahre ich trotzdem mit dem Fahrrad zur Arbeit.',
      'Obwohl es heute regnet, fahre ich mit dem Fahrrad zur Arbeit.'
    ],
    '重點檢查 obwohl 從句的動詞末位、主句語序及 trotzdem 是否使用自然。',
    20,
    300
  ),
  (
    'b2-argumente-ai-response',
    'b2-argumente',
    'B2',
    'free_response',
    '遠距工作立場回應',
    '以三至四句德語表達立場，提出理由並回應一項反方觀點。',
    'Sollten Unternehmen ihren Beschäftigten mehr Homeoffice ermöglichen? Begründe deine Position und gehe auf ein Gegenargument ein.',
    null,
    array['B2.argumentation.counterargument', 'B2.writing.cohesion'],
    array[
      'Unternehmen sollten mehr Homeoffice ermöglichen, weil flexible Arbeitszeiten die Zufriedenheit erhöhen können. Zwar leidet manchmal der direkte Austausch, doch feste Präsenztage können dieses Problem ausgleichen.'
    ],
    '評估論點、反方回應、篇章連接及 B2 程度的正式清晰度，不要求與參考答案逐字相同。',
    60,
    800
  ),
  (
    'c1-zusammenfassung-ai-response',
    'c1-zusammenfassung',
    'C1',
    'free_response',
    '研究結果摘要',
    '用兩至三句中性德語摘要研究結果與限制。',
    'Eine Studie meldet einen Zusammenhang zwischen flexiblem Arbeiten und höherer Produktivität. Die Stichprobe umfasst jedoch nur 120 Beschäftigte eines einzigen Unternehmens. Fasse Ergebnis und Einschränkung neutral zusammen.',
    null,
    array['C1.writing.academic_summary', 'C1.mediation.synthesis'],
    array[
      'Der Studie zufolge besteht ein Zusammenhang zwischen flexiblem Arbeiten und einer höheren Produktivität. Da lediglich 120 Beschäftigte eines Unternehmens untersucht wurden, ist die Übertragbarkeit der Ergebnisse jedoch eingeschränkt.'
    ],
    '重點檢查中性轉述、結果與限制的區分、資訊壓縮及 C1 篇章銜接。',
    80,
    900
  ),
  (
    'c2-ironie-ai-translation',
    'c2-ironie',
    'C2',
    'translation',
    '含蓄反諷翻譯',
    '翻譯為自然德語，保留原句含蓄而帶反諷的語氣。',
    'Übertrage die feine Ironie ins Deutsche.',
    '這項改革被宣傳成劃時代的突破，結果卻只是替舊問題換了個名字。',
    array['C2.pragmatics.irony', 'C2.register.flexible_shift'],
    array[
      'Die Reform wurde als epochaler Durchbruch angepriesen, erwies sich letztlich jedoch nur als neuer Name für die alten Probleme.'
    ],
    '評估語氣、語域、反諷效果與語意精確度；可接受不同但自然的高階表達。',
    35,
    500
  );

insert into public.exercises (
  id,
  activity_id,
  level,
  type,
  title,
  instruction_zh_tw,
  prompt_de,
  payload_json,
  skill_ids,
  estimated_seconds,
  difficulty,
  source_type,
  review_status,
  status,
  version,
  order_index
)
select
  md5('deutschtrainer:exercise:' || slug)::uuid,
  md5('deutschtrainer:activity:' || lesson_slug)::uuid,
  level,
  type,
  title,
  instruction_zh_tw,
  prompt_de,
  jsonb_build_object(
    'promptZhTw', prompt_zh_tw,
    'responsePlaceholderZhTw', '請輸入你的德語回答',
    'minimumCharacters', minimum_characters,
    'maximumCharacters', maximum_characters
  ),
  skill_ids,
  180,
  case level when 'B1' then 2 when 'B2' then 3 when 'C1' then 4 else 5 end,
  'human',
  'approved',
  'published',
  1,
  10
from public._phase5_ai_exercise_seed
on conflict (id) do update
set
  activity_id = excluded.activity_id,
  level = excluded.level,
  type = excluded.type,
  title = excluded.title,
  instruction_zh_tw = excluded.instruction_zh_tw,
  prompt_de = excluded.prompt_de,
  payload_json = excluded.payload_json,
  skill_ids = excluded.skill_ids,
  estimated_seconds = excluded.estimated_seconds,
  difficulty = excluded.difficulty,
  source_type = excluded.source_type,
  review_status = excluded.review_status,
  status = excluded.status,
  version = excluded.version,
  order_index = excluded.order_index,
  updated_at = now(),
  deleted_at = null;

insert into public.exercise_answers (
  id,
  exercise_id,
  answer_json,
  grading_policy_json,
  explanation_zh_tw
)
select
  md5('deutschtrainer:answer:' || slug)::uuid,
  md5('deutschtrainer:exercise:' || slug)::uuid,
  jsonb_build_object(
    'referenceAnswersDe', to_jsonb(reference_answers_de),
    'gradingNotesZhTw', grading_notes_zh_tw
  ),
  '{}'::jsonb,
  grading_notes_zh_tw
from public._phase5_ai_exercise_seed
on conflict (exercise_id) do update
set
  answer_json = excluded.answer_json,
  grading_policy_json = excluded.grading_policy_json,
  explanation_zh_tw = excluded.explanation_zh_tw,
  updated_at = now();

insert into public.skills (
  id,
  code,
  name_zh_tw,
  name_de,
  description_zh_tw,
  level,
  category,
  mastery_threshold,
  review_policy_json,
  status
)
values
  (md5('skill:B1.word_order.subordinate_clause')::uuid, 'B1.word_order.subordinate_clause', '從句語序', 'Nebensatzstellung', '將變位動詞置於從句末位。', 'B1', 'grammar', 80, '{"initialIntervalDays":1,"maxIntervalDays":30,"easeFactor":2.3}', 'published'),
  (md5('skill:B1.interaction.giving_reasons')::uuid, 'B1.interaction.giving_reasons', '說明理由', 'Gründe nennen', '在日常互動中清楚說明理由。', 'B1', 'interaction', 80, '{"initialIntervalDays":1,"maxIntervalDays":30,"easeFactor":2.3}', 'published'),
  (md5('skill:B1.case.dative')::uuid, 'B1.case.dative', '三格', 'Dativ', '辨識並形成常用三格結構。', 'B1', 'grammar', 80, '{}', 'published'),
  (md5('skill:B1.preposition.two_way')::uuid, 'B1.preposition.two_way', '雙向介系詞', 'Wechselpräpositionen', '依位置或方向選擇三格及四格。', 'B1', 'grammar', 80, '{}', 'published'),
  (md5('skill:B1.interaction.appointment')::uuid, 'B1.interaction.appointment', '預約互動', 'Termine vereinbaren', '禮貌安排或更改預約。', 'B1', 'interaction', 80, '{}', 'published'),
  (md5('skill:B1.vocabulary.health')::uuid, 'B1.vocabulary.health', '健康詞彙', 'Gesundheitswortschatz', '描述常見症狀與醫療流程。', 'B1', 'vocabulary', 80, '{}', 'published'),
  (md5('skill:B1.writing.formal_email')::uuid, 'B1.writing.formal_email', '正式電子郵件', 'Formelle E-Mail', '使用基本正式信件格式。', 'B1', 'writing', 80, '{}', 'published'),
  (md5('skill:B1.register.formal')::uuid, 'B1.register.formal', '基本正式語域', 'Formelles Register', '區分日常與正式措辭。', 'B1', 'writing', 80, '{}', 'published'),
  (md5('skill:B1.interaction.opinion')::uuid, 'B1.interaction.opinion', '表達意見', 'Meinung äußern', '說明個人立場與簡單理由。', 'B1', 'interaction', 80, '{}', 'published'),
  (md5('skill:B1.writing.connectors')::uuid, 'B1.writing.connectors', '基礎篇章連接', 'Konnektoren', '使用連接詞建立句間關係。', 'B1', 'writing', 80, '{}', 'published'),
  (md5('skill:B2.argumentation.counterargument')::uuid, 'B2.argumentation.counterargument', '反方論點', 'Gegenargument', '提出並回應反方觀點。', 'B2', 'interaction', 82, '{}', 'published'),
  (md5('skill:B2.writing.cohesion')::uuid, 'B2.writing.cohesion', '篇章銜接', 'Textkohäsion', '使用多樣連接方式組織論證。', 'B2', 'writing', 82, '{}', 'published'),
  (md5('skill:B2.register.formal')::uuid, 'B2.register.formal', '正式職場語域', 'Formelles Berufsregister', '在職場書面及口頭互動中維持正式語氣。', 'B2', 'writing', 82, '{}', 'published'),
  (md5('skill:B2.interaction.negotiation')::uuid, 'B2.interaction.negotiation', '協商', 'Verhandeln', '提出替代方案並促成共識。', 'B2', 'interaction', 82, '{}', 'published'),
  (md5('skill:B2.reading.news')::uuid, 'B2.reading.news', '新聞閱讀', 'Nachrichten lesen', '理解新聞論點與資訊來源。', 'B2', 'reading', 82, '{}', 'published'),
  (md5('skill:C1.writing.academic_summary')::uuid, 'C1.writing.academic_summary', '學術摘要', 'Akademische Zusammenfassung', '中性且精確地濃縮複雜資訊。', 'C1', 'writing', 85, '{}', 'published'),
  (md5('skill:C1.reading.author_stance')::uuid, 'C1.reading.author_stance', '作者立場', 'Autorenhaltung', '辨識文本中明示與隱含的作者立場。', 'C1', 'reading', 85, '{}', 'published'),
  (md5('skill:C1.mediation.synthesis')::uuid, 'C1.mediation.synthesis', '資訊整合', 'Informationssynthese', '跨段落或來源整合核心資訊。', 'C1', 'mediation', 85, '{}', 'published'),
  (md5('skill:C2.pragmatics.irony')::uuid, 'C2.pragmatics.irony', '反諷辨識', 'Ironie erkennen', '依語境理解字面與意圖的落差。', 'C2', 'reading', 88, '{}', 'published'),
  (md5('skill:C2.register.flexible_shift')::uuid, 'C2.register.flexible_shift', '彈性語域轉換', 'Flexibler Registerwechsel', '精準辨識及運用語域轉換。', 'C2', 'interaction', 88, '{}', 'published')
on conflict (code) do update
set
  name_zh_tw = excluded.name_zh_tw,
  name_de = excluded.name_de,
  description_zh_tw = excluded.description_zh_tw,
  level = excluded.level,
  category = excluded.category,
  mastery_threshold = excluded.mastery_threshold,
  review_policy_json = excluded.review_policy_json,
  status = excluded.status,
  updated_at = now();

insert into public.grammar_topics (
  id,
  code,
  title_zh_tw,
  title_de,
  level,
  short_explanation_zh_tw,
  full_explanation_zh_tw,
  difficulty,
  status,
  version
)
values
  (md5('grammar:b1-nebensatz')::uuid, 'B1.nebensatz', '從句動詞末位', 'Verbendstellung im Nebensatz', 'B1', 'weil、obwohl 等連接詞會把變位動詞推到句末。', '辨識主從句邊界，保留其他句子成分順序，最後放入變位動詞。', 2, 'published', 1),
  (md5('grammar:b1-wechsel')::uuid, 'B1.wechselpraeposition', '雙向介系詞', 'Wechselpräpositionen', 'B1', '位置通常用三格，方向或位置變化通常用四格。', '先判斷動詞描述靜態位置或目的地，再選擇相應格位。', 2, 'published', 1),
  (md5('grammar:b1-dativ')::uuid, 'B1.dativ', '三格結構', 'Dativstrukturen', 'B1', '部分動詞與介系詞固定要求三格。', '學習 helfen、danken 等常見三格動詞及冠詞變化。', 2, 'published', 1),
  (md5('grammar:b1-formal')::uuid, 'B1.formal_email', '正式信件格式', 'Formelle E-Mail', 'B1', '正式信件需使用合宜稱謂、請求與結尾。', '依收件人關係選擇 Sie、委婉式與正式結尾。', 2, 'published', 1),
  (md5('grammar:b1-connectors')::uuid, 'B1.connectors', '基礎連接詞', 'Grundlegende Konnektoren', 'B1', '連接詞標示原因、結果、對比與補充。', '注意連接詞種類會影響後續語序。', 2, 'published', 1),
  (md5('grammar:b2-concession')::uuid, 'B2.concession', '讓步結構', 'Konzessive Strukturen', 'B2', 'zwar ... aber 等結構先承認一點，再凸顯主要立場。', '讓步語句要保持兩部分在語意與句法上的平衡。', 3, 'published', 1),
  (md5('grammar:b2-nominal')::uuid, 'B2.nominal_style', '名詞化語體', 'Nominalstil', 'B2', '正式文本常以名詞化壓縮資訊。', '名詞化可提高資訊密度，但須避免過度堆疊。', 3, 'published', 1),
  (md5('grammar:c1-reported')::uuid, 'C1.reported_speech', '報導式虛擬一式', 'Konjunktiv I', 'C1', '第一虛擬式用於中性轉述他人主張。', '當形式與直陳式相同時，可依語境改用第二虛擬式替代形式。', 4, 'published', 1),
  (md5('grammar:c1-academic')::uuid, 'C1.academic_linking', '學術篇章銜接', 'Akademische Verknüpfung', 'C1', '精確區分證據、限制、推論與結論。', '連接表達應清楚標示論證關係並避免不當因果推論。', 4, 'published', 1),
  (md5('grammar:c2-pragmatics')::uuid, 'C2.pragmatic_marking', '語用標記', 'Pragmatische Markierung', 'C2', '措辭、語境與預設共同產生反諷或含蓄評價。', '理解高階文本時需同時分析字面、說話者立場與共享背景。', 5, 'published', 1)
on conflict (code) do update
set
  title_zh_tw = excluded.title_zh_tw,
  title_de = excluded.title_de,
  level = excluded.level,
  short_explanation_zh_tw = excluded.short_explanation_zh_tw,
  full_explanation_zh_tw = excluded.full_explanation_zh_tw,
  difficulty = excluded.difficulty,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

with vocabulary_seed(level, lemma, part_of_speech, definition_zh_tw, example_de, frequency_rank) as (
  values
    ('B1'::public.cefr_level, 'obwohl', 'Konjunktion', '雖然、儘管', 'Obwohl es regnet, gehen wir spazieren.', 101),
    ('B1', 'deshalb', 'Adverb', '因此', 'Es regnet; deshalb bleibe ich zu Hause.', 102),
    ('B1', 'trotzdem', 'Adverb', '儘管如此', 'Er ist müde, trotzdem arbeitet er weiter.', 103),
    ('B1', 'die Miete', 'Nomen', '租金', 'Die Miete ist jeden Monat fällig.', 104),
    ('B1', 'die Kaution', 'Nomen', '押金', 'Die Kaution beträgt zwei Monatsmieten.', 105),
    ('B1', 'der Mietvertrag', 'Nomen', '租賃合約', 'Bitte lesen Sie den Mietvertrag genau.', 106),
    ('B1', 'der Termin', 'Nomen', '預約、日期', 'Ich möchte einen Termin vereinbaren.', 107),
    ('B1', 'die Beschwerden', 'Nomen', '症狀、不適', 'Seit wann haben Sie diese Beschwerden?', 108),
    ('B1', 'das Rezept', 'Nomen', '處方', 'Die Ärztin stellt ein Rezept aus.', 109),
    ('B1', 'sich bewerben', 'Verb', '申請職位', 'Ich bewerbe mich um die Stelle.', 110),
    ('B1', 'der Lebenslauf', 'Nomen', '履歷', 'Der Lebenslauf liegt der Bewerbung bei.', 111),
    ('B1', 'die Stelle', 'Nomen', '職缺、職位', 'Die Stelle ist ab August frei.', 112),
    ('B1', 'einerseits', 'Adverb', '一方面', 'Einerseits spart man Zeit.', 113),
    ('B1', 'andererseits', 'Adverb', '另一方面', 'Andererseits fehlt der Kontakt.', 114),
    ('B1', 'außerdem', 'Adverb', '此外', 'Außerdem ist die Verbindung günstig.', 115),
    ('B2', 'hingegen', 'Adverb', '相較之下', 'Die zweite Lösung ist hingegen günstiger.', 201),
    ('B2', 'demgegenüber', 'Adverb', '與此相對', 'Demgegenüber stehen höhere Kosten.', 202),
    ('B2', 'einwenden', 'Verb', '提出異議', 'Dagegen lässt sich einwenden, dass Daten fehlen.', 203),
    ('B2', 'überzeugen', 'Verb', '使信服', 'Das Argument überzeugt nur teilweise.', 204),
    ('B2', 'langfristig', 'Adjektiv', '長期的', 'Langfristig sinkt der Energieverbrauch.', 205),
    ('B2', 'bezüglich', 'Präposition', '關於', 'Bezüglich Ihrer Anfrage melde ich mich morgen.', 206),
    ('B2', 'die Rücksprache', 'Nomen', '商議、確認', 'Ich halte intern Rücksprache.', 207),
    ('B2', 'unterbreiten', 'Verb', '正式提出', 'Wir möchten Ihnen einen Vorschlag unterbreiten.', 208),
    ('B2', 'maßgeblich', 'Adjektiv', '具決定性的、適用的', 'Welche Frist ist maßgeblich?', 209),
    ('B2', 'die Alternative', 'Nomen', '替代方案', 'Als Alternative schlage ich Montag vor.', 210),
    ('B2', 'sachlich', 'Adjektiv', '客觀理性的', 'Bitte formulieren Sie die Kritik sachlich.', 211),
    ('B2', 'die Maßnahme', 'Nomen', '措施', 'Die Maßnahme reduziert Emissionen.', 212),
    ('B2', 'unterschätzen', 'Verb', '低估', 'Man darf die Kosten nicht unterschätzen.', 213),
    ('B2', 'kooperativ', 'Adjektiv', '合作的', 'Die Antwort wirkt kooperativ.', 214),
    ('B2', 'die Frist', 'Nomen', '期限', 'Die Frist endet am Freitag.', 215),
    ('C1', 'die Befundlage', 'Nomen', '研究證據現況', 'Die Befundlage bleibt uneinheitlich.', 301),
    ('C1', 'einschränkend', 'Adverb', '帶有限制地說', 'Einschränkend ist die kleine Stichprobe zu nennen.', 302),
    ('C1', 'ableiten', 'Verb', '推導', 'Daraus lässt sich keine Kausalität ableiten.', 303),
    ('C1', 'die Stichprobe', 'Nomen', '樣本', 'Die Stichprobe ist nicht repräsentativ.', 304),
    ('C1', 'repräsentativ', 'Adjektiv', '具代表性的', 'Die Daten sind nur bedingt repräsentativ.', 305),
    ('C1', 'der Kausalschluss', 'Nomen', '因果推論', 'Die Studie erlaubt keinen Kausalschluss.', 306),
    ('C1', 'zufolge', 'Postposition', '根據', 'Der Studie zufolge steigt die Nachfrage.', 307),
    ('C1', 'festhalten', 'Verb', '總結指出', 'Zusammenfassend lässt sich festhalten, dass ...', 308),
    ('C1', 'übertragbar', 'Adjektiv', '可推廣的', 'Die Ergebnisse sind nicht ohne Weiteres übertragbar.', 309),
    ('C1', 'der Zusammenhang', 'Nomen', '關聯', 'Es besteht ein statistischer Zusammenhang.', 310),
    ('C2', 'mitnichten', 'Adverb', '絕非', 'Die Reform war mitnichten ein Erfolg.', 401),
    ('C2', 'vermeintlich', 'Adjektiv', '所謂的、表面上的', 'Die vermeintlich einfache Lösung war riskant.', 402),
    ('C2', 'augenzwinkernd', 'Adverb', '帶著會心玩笑地', 'Der Kommentar war augenzwinkernd gemeint.', 403),
    ('C2', 'die Implikatur', 'Nomen', '會話含意', 'Die Implikatur ergibt sich aus dem Kontext.', 404),
    ('C2', 'die Polemik', 'Nomen', '論戰式激烈言辭', 'Der Text kippt in Polemik.', 405),
    ('C2', 'salopp', 'Adjektiv', '隨便口語的', 'Die Formulierung wirkt bewusst salopp.', 406),
    ('C2', 'nuanciert', 'Adjektiv', '細膩有層次的', 'Sie formuliert ihre Kritik nuanciert.', 407),
    ('C2', 'vordergründig', 'Adjektiv', '表面上的', 'Vordergründig klingt die Aussage zustimmend.', 408),
    ('C2', 'unvermittelt', 'Adverb', '突然且缺乏過渡地', 'Der Registerwechsel erfolgt unvermittelt.', 409),
    ('C2', 'die Brechung', 'Nomen', '有意造成的反差', 'Die stilistische Brechung erzeugt Distanz.', 410)
)
insert into public.vocabulary (
  id,
  lemma,
  part_of_speech,
  level,
  frequency_rank,
  definitions_zh_tw,
  example_sentences,
  status,
  version
)
select
  md5('vocabulary:' || level::text || ':' || lemma)::uuid,
  lemma,
  part_of_speech,
  level,
  frequency_rank,
  array[definition_zh_tw],
  array[example_de],
  'published',
  1
from vocabulary_seed
on conflict (level, lemma) do update
set
  part_of_speech = excluded.part_of_speech,
  frequency_rank = excluded.frequency_rank,
  definitions_zh_tw = excluded.definitions_zh_tw,
  example_sentences = excluded.example_sentences,
  status = excluded.status,
  version = excluded.version,
  updated_at = now();

create table public._phase6_writing_prompt_seed (
  slug text primary key,
  lesson_slug text not null,
  level public.cefr_level not null,
  writing_type public.writing_type not null,
  title_zh_tw text not null,
  prompt_de text not null,
  prompt_zh_tw text not null,
  requirements_json jsonb not null,
  minimum_words integer not null,
  maximum_words integer not null,
  estimated_minutes integer not null,
  skill_ids text[] not null,
  grading_notes_zh_tw text not null,
  reference_outline_json jsonb not null,
  reference_version_de text not null
);

insert into public._phase6_writing_prompt_seed values
  (
    'b1-kurs-termin',
    'b1-bewerbung',
    'B1',
    'formal_email',
    '更改德語課程日期',
    'Sie besuchen einen Deutschkurs. Wegen Ihrer Arbeit können Sie nächste Woche nicht am Unterricht teilnehmen. Schreiben Sie an Frau Berger von der Sprachschule und bitten Sie um eine Lösung.',
    '你正在參加德語課程，但因工作無法出席下週課程。請寫信給語言學校的 Berger 女士，說明原因並提出解決方式。',
    '["使用正式稱謂與結尾", "說明無法出席的原因", "詢問是否能補課或取得教材", "提出一個可行的替代方案"]',
    60,
    140,
    20,
    array['B1.writing.formal_email', 'B1.register.formal'],
    '重點檢查正式信件格式、weil 從句語序、請求是否禮貌，以及四項任務是否完整。',
    '["正式稱謂", "說明缺席與原因", "禮貌詢問補課或教材", "提出替代日期", "正式結尾"]',
    'Sehr geehrte Frau Berger, leider kann ich nächste Woche nicht am Deutschkurs teilnehmen, weil ich beruflich verreisen muss. Könnten Sie mir bitte mitteilen, ob ich den Unterricht an einem anderen Termin nachholen kann? Falls das nicht möglich ist, würde ich mich über die Arbeitsblätter und Informationen zu den Hausaufgaben freuen. Ab dem darauffolgenden Montag bin ich wieder verfügbar. Vielen Dank für Ihre Hilfe. Mit freundlichen Grüßen, Lin Chen'
  ),
  (
    'b2-vier-tage-woche',
    'b2-argumente',
    'B2',
    'argumentative_essay',
    '每週工作四天是否可行',
    'Ein Unternehmen möchte die Vier-Tage-Woche einführen. Verfassen Sie einen argumentativen Text für das interne Forum. Wägen Sie Vorteile und Nachteile ab und formulieren Sie eine begründete Empfehlung.',
    '某公司考慮導入每週工作四天。請為內部論壇撰寫論證文章，權衡利弊並提出有理由的建議。',
    '["提出清楚立場", "至少說明兩項優點與兩項缺點", "回應一項可能的反方意見", "以具體條件提出結論"]',
    120,
    220,
    35,
    array['B2.argumentation.counterargument', 'B2.writing.cohesion'],
    '評估論點是否平衡、讓步與反駁是否成立、篇章連接是否清楚，以及語域是否適合公司內部論壇。',
    '["議題與立場", "生產力與員工福祉的優點", "人力配置與客戶服務的風險", "回應成本疑慮", "附條件的建議"]',
    'Die Vier-Tage-Woche kann die Motivation erhöhen und Fehlzeiten reduzieren. Beschäftigte gewinnen mehr Erholungszeit, während Unternehmen als Arbeitgeber attraktiver werden. Allerdings lässt sich nicht jede Tätigkeit ohne Weiteres auf vier Tage verteilen. Besonders im Kundendienst können längere Wartezeiten entstehen, außerdem droht bei unverändertem Arbeitsumfang eine höhere tägliche Belastung. Dagegen lässt sich einwenden, dass bessere Abläufe einen Teil dieser Probleme ausgleichen. Das überzeugt jedoch nur, wenn Teams ausreichend Personal und klare Prioritäten erhalten. Ich empfehle daher ein sechsmonatiges Pilotprojekt in geeigneten Abteilungen. Produktivität, Überstunden und Kundenzufriedenheit sollten dabei transparent gemessen werden. Erst auf dieser Grundlage sollte das Unternehmen über eine dauerhafte Einführung entscheiden.'
  ),
  (
    'c1-digitale-lehre',
    'c1-zusammenfassung',
    'C1',
    'source_integration',
    '整合數位教學研究觀點',
    'Zwei Untersuchungen zur digitalen Hochschullehre kommen zu unterschiedlichen Ergebnissen: Studie A berichtet von höherer zeitlicher Flexibilität und vergleichbaren Prüfungsergebnissen. Studie B beobachtet bei Studienanfängern weniger Austausch und mehr Studienabbrüche. Verfassen Sie eine strukturierte Synthese, grenzen Sie die Aussagekraft ein und leiten Sie eine vorsichtige Empfehlung ab.',
    '兩項數位大學教學研究得到不同結果：研究 A 指出時間彈性提高且考試結果相近；研究 B 觀察到新生交流減少、退學增加。請整合兩方觀點、說明證據限制，並提出審慎建議。',
    '["中性區分兩項研究的主張", "整合一致與矛盾之處", "指出至少兩項證據限制", "避免把相關性寫成因果", "提出審慎且可執行的建議"]',
    180,
    320,
    50,
    array['C1.writing.academic_summary', 'C1.mediation.synthesis'],
    '檢查中性轉述、資訊整合、研究限制、因果推論界線，以及學術篇章的精確銜接。',
    '["共同研究問題", "研究 A 的結果", "研究 B 的結果", "方法與樣本限制", "綜合判斷與條件式建議"]',
    'Die beiden Untersuchungen zeichnen kein einheitliches Bild der digitalen Hochschullehre. Studie A zufolge erhöht das Format die zeitliche Flexibilität, ohne dass sich die Prüfungsergebnisse wesentlich verschlechtern. Studie B verweist demgegenüber auf geringeren sozialen Austausch und eine höhere Abbruchquote unter Studienanfängern. Die Befunde widersprechen einander nur teilweise, da sie unterschiedliche Zielgrößen und Studierendengruppen betreffen. Ihre Aussagekraft bleibt zudem begrenzt: Weder die Größe und Zusammensetzung der Stichproben noch mögliche Unterschiede zwischen Fachrichtungen werden genannt. Aus den beobachteten Zusammenhängen lässt sich daher kein eindeutiger Kausalschluss ableiten. Sinnvoll erscheint ein hybrides Modell, das flexible digitale Phasen mit verbindlichen Präsenzangeboten für Beratung und Zusammenarbeit verbindet. Begleitend sollten Lernerfolg, Teilhabe und Studienabbrüche differenziert nach Studienphase untersucht werden. Eine allgemeine Umstellung wäre erst dann vertretbar, wenn belastbarere und über mehrere Semester erhobene Daten vorliegen.'
  ),
  (
    'c2-reform-kommentar',
    'c2-ironie',
    'C2',
    'critical_review',
    '評論改革論述的修辭策略',
    'Ein Kommentar bezeichnet eine gescheiterte Verwaltungsreform als "Meisterstück der Effizienz", wechselt anschließend von nüchterner Analyse zu salopper Polemik und endet mit einem scheinbar versöhnlichen Lob. Analysieren und bewerten Sie die rhetorische Wirkung. Formulieren Sie außerdem eine präzisere Alternative für den Schlussabschnitt.',
    '一篇評論把失敗的行政改革稱為「效率傑作」，之後從冷靜分析突然轉為口語化論戰，最後以看似和解的讚美收尾。請分析並評價其修辭效果，並為結尾段落提出更精準的改寫。',
    '["解釋反諷如何由語境產生", "分析語域轉換的效果與風險", "區分作者立場與字面陳述", "評價論證是否因修辭而受損", "提供符合原意但更精準的結尾改寫"]',
    220,
    400,
    65,
    array['C2.pragmatics.irony', 'C2.register.flexible_shift'],
    '評估語用推論、反諷與隱含立場的辨識是否精確，並檢查改寫能否保留批判力度而避免空泛或不必要的語域跳動。',
    '["辨識字面與實際評價的落差", "分析從分析到論戰的語域轉換", "說明假性讚美的語用功能", "衡量修辭對可信度的影響", "提出風格一致的替代結尾"]',
    'Die Bezeichnung der Reform als "Meisterstück der Effizienz" ist nur vordergründig ein Lob. Im Kontext des dokumentierten Scheiterns aktiviert sie eine ironische Lesart und macht die Distanz des Autors unmissverständlich. Der anschließende Wechsel von analytischer Sachlichkeit zu salopper Polemik erhöht zwar kurzfristig die Schlagkraft, schwächt jedoch die zuvor aufgebaute argumentative Autorität. Auch das versöhnlich klingende Schlusslob funktioniert als Implikatur: Es bestätigt nicht die Reform, sondern führt die offizielle Selbstdarstellung vor. Diese rhetorische Verdichtung ist wirkungsvoll, sofern das Publikum die geteilten Hintergrundannahmen erkennt; andernfalls droht die Kritik als bloße Herabsetzung zu erscheinen. Präziser ließe sich schließen: Die Reform hat einzelne Verfahren sichtbar gemacht, ihr zentrales Effizienzversprechen jedoch nicht eingelöst. Eine belastbare Neubewertung setzt transparente Kennzahlen, klar benannte Verantwortlichkeiten und überprüfbare Fristen voraus. So bleibt die Kritik pointiert, ohne den analytischen Maßstab zugunsten einer bloßen Pointe aufzugeben.'
  );

insert into public.writing_prompts (
  id,
  lesson_id,
  level,
  writing_type,
  title_zh_tw,
  prompt_de,
  prompt_zh_tw,
  requirements_json,
  minimum_words,
  maximum_words,
  estimated_minutes,
  skill_ids,
  review_status,
  status,
  version
)
select
  md5('deutschtrainer:writing-prompt:' || slug)::uuid,
  md5('deutschtrainer:lesson:' || lesson_slug)::uuid,
  level,
  writing_type,
  title_zh_tw,
  prompt_de,
  prompt_zh_tw,
  requirements_json,
  minimum_words,
  maximum_words,
  estimated_minutes,
  skill_ids,
  'approved',
  'published',
  1
from public._phase6_writing_prompt_seed
on conflict (lesson_id, writing_type) do update
set
  level = excluded.level,
  title_zh_tw = excluded.title_zh_tw,
  prompt_de = excluded.prompt_de,
  prompt_zh_tw = excluded.prompt_zh_tw,
  requirements_json = excluded.requirements_json,
  minimum_words = excluded.minimum_words,
  maximum_words = excluded.maximum_words,
  estimated_minutes = excluded.estimated_minutes,
  skill_ids = excluded.skill_ids,
  review_status = excluded.review_status,
  status = excluded.status,
  version = excluded.version,
  updated_at = now(),
  deleted_at = null;

insert into public.writing_prompt_rules (
  id,
  prompt_id,
  grading_notes_zh_tw,
  reference_outline_json,
  reference_version_de
)
select
  md5('deutschtrainer:writing-rule:' || slug)::uuid,
  md5('deutschtrainer:writing-prompt:' || slug)::uuid,
  grading_notes_zh_tw,
  reference_outline_json,
  reference_version_de
from public._phase6_writing_prompt_seed
on conflict (prompt_id) do update
set
  grading_notes_zh_tw = excluded.grading_notes_zh_tw,
  reference_outline_json = excluded.reference_outline_json,
  reference_version_de = excluded.reference_version_de,
  updated_at = now();

drop table public._phase3_exercise_seed;
drop table public._phase3_lesson_seed;
drop table public._phase5_ai_exercise_seed;
drop table public._phase6_writing_prompt_seed;

end;
$phase3_seed$;
