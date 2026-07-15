grant usage on schema public to service_role;

grant select on table
  public.grammar_topics,
  public.vocabulary,
  public.exercises,
  public.activities,
  public.lessons
to service_role;

-- Existing deployments received the Phase 3 seed before structured grammar details existed.
-- Fill only empty arrays so editor-maintained content is never overwritten.
with grammar_backfill(
  code,
  example_de,
  example_zh_tw,
  incorrect_de,
  correct_de,
  mistake_explanation_zh_tw,
  related_skill_ids,
  prerequisite_topic_ids
) as (
  values
    (
      'B1.nebensatz',
      'Ich bleibe zu Hause, weil es stark regnet.',
      '我待在家，因為雨下得很大。',
      'Ich bleibe zu Hause, weil es regnet stark.',
      'Ich bleibe zu Hause, weil es stark regnet.',
      '從句中的變位動詞 regnet 必須放在句末。',
      array['B1.word_order.subordinate_clause'],
      '{}'::text[]
    ),
    (
      'B1.wechselpraeposition',
      'Das Bild hängt an der Wand. Ich hänge das Bild an die Wand.',
      '畫掛在牆上。我把畫掛到牆上。',
      'Ich stelle den Stuhl neben dem Sofa.',
      'Ich stelle den Stuhl neben das Sofa.',
      'stellen 表示移動到目的位置，因此使用第四格。',
      array['B1.case.dative', 'B1.preposition.two_way'],
      '{}'::text[]
    ),
    (
      'B1.dativ',
      'Wir helfen dem Nachbarn beim Umzug.',
      '我們幫鄰居搬家。',
      'Ich helfe den Nachbar.',
      'Ich helfe dem Nachbarn.',
      'helfen 要求第三格；陽性弱變化名詞同時加上 -n。',
      array['B1.case.dative'],
      '{}'::text[]
    ),
    (
      'B1.formal_email',
      'Könnten Sie mir bitte mitteilen, ob die Stelle noch frei ist?',
      '請問您能否告知我該職缺是否仍然開放？',
      'Hey, ist der Job noch da?',
      'Sehr geehrte Damen und Herren, ist die Stelle noch ausgeschrieben?',
      '正式求職信應避免口語稱呼與過度簡略的問法。',
      array['B1.writing.formal_email', 'B1.register.formal'],
      '{}'::text[]
    ),
    (
      'B1.connectors',
      'Es regnet. Deshalb bleibe ich zu Hause.',
      '正在下雨。因此我待在家。',
      'Deshalb ich bleibe zu Hause.',
      'Deshalb bleibe ich zu Hause.',
      'deshalb 後仍遵守主句動詞第二位。',
      array['B1.writing.connectors', 'B1.interaction.opinion'],
      array['B1.nebensatz']
    ),
    (
      'B2.concession',
      'Die Umstellung ist zwar teuer, langfristig aber sinnvoll.',
      '這項轉型固然昂貴，但長期而言是合理的。',
      'Zwar ist die Lösung teuer, sondern sie ist sinnvoll.',
      'Zwar ist die Lösung teuer, aber sie ist sinnvoll.',
      'sondern 用於否定後更正；zwar 的典型搭配是 aber 或 jedoch。',
      array['B2.argumentation.counterargument', 'B2.writing.cohesion'],
      array['B1.connectors']
    ),
    (
      'B2.nominal_style',
      'Nach eingehender Prüfung der Unterlagen erhalten Sie eine Rückmeldung.',
      '詳細審查文件後，您會收到回覆。',
      'Wegen der Durchführung der Überprüfung der Daten ...',
      'Weil wir die Daten überprüft haben, ...',
      '過多名詞化會降低可讀性；必要時改回動詞句。',
      array['B2.register.formal'],
      array['B1.formal_email']
    ),
    (
      'C1.reported_speech',
      'Die Autorin erklärt, die Ergebnisse seien nicht übertragbar.',
      '作者表示，這些結果不具可推廣性。',
      'Die Autorin behauptet, die Ergebnisse sind eindeutig.',
      'Die Autorin behauptet, die Ergebnisse seien eindeutig.',
      '正式中性轉述時，以 seien 與作者主張保持距離。',
      array['C1.writing.academic_summary'],
      array['B1.nebensatz']
    ),
    (
      'C1.academic_linking',
      'Die Daten weisen auf einen Zusammenhang hin; ein Kausalschluss ist jedoch nicht zulässig.',
      '資料顯示存在關聯，但不能據此作出因果推論。',
      'Die Werte korrelieren, deshalb beweist die Studie die Ursache.',
      'Die Werte korrelieren; daraus folgt jedoch kein eindeutiger Kausalschluss.',
      '相關性不足以直接證明因果關係。',
      array['C1.writing.academic_summary', 'C1.reading.author_stance'],
      array['B2.concession', 'C1.reported_speech']
    ),
    (
      'C2.pragmatic_marking',
      'Das war ja eine ganz hervorragende Idee – jetzt funktioniert gar nichts mehr.',
      '這主意可真是太棒了，現在什麼都不能用了。',
      'hervorragend 一律表示真心稱讚。',
      'hervorragend 可能因語境與語調形成反諷。',
      '不可只依單一詞彙判斷說話者立場。',
      array['C2.pragmatics.irony', 'C2.register.flexible_shift'],
      array['C1.academic_linking']
    )
)
update public.grammar_topics as topic
set
  rules_json = case
    when jsonb_typeof(topic.rules_json) = 'array' and jsonb_array_length(topic.rules_json) > 0
      then topic.rules_json
    else jsonb_build_array(
      jsonb_build_object(
        'titleZhTw', topic.title_zh_tw,
        'explanationZhTw', topic.full_explanation_zh_tw
      )
    )
  end,
  examples_json = case
    when jsonb_typeof(topic.examples_json) = 'array' and jsonb_array_length(topic.examples_json) > 0
      then topic.examples_json
    else jsonb_build_array(
      jsonb_build_object(
        'textDe', details.example_de,
        'translationZhTw', details.example_zh_tw
      )
    )
  end,
  common_mistakes_json = case
    when jsonb_typeof(topic.common_mistakes_json) = 'array'
      and jsonb_array_length(topic.common_mistakes_json) > 0
      then topic.common_mistakes_json
    else jsonb_build_array(
      jsonb_build_object(
        'incorrectDe', details.incorrect_de,
        'correctDe', details.correct_de,
        'explanationZhTw', details.mistake_explanation_zh_tw
      )
    )
  end,
  related_skill_ids = case
    when cardinality(topic.related_skill_ids) > 0 then topic.related_skill_ids
    else details.related_skill_ids
  end,
  prerequisite_topic_ids = case
    when cardinality(topic.prerequisite_topic_ids) > 0 then topic.prerequisite_topic_ids
    else details.prerequisite_topic_ids
  end,
  updated_at = now()
from grammar_backfill as details
where topic.code = details.code
  and (
    jsonb_array_length(topic.rules_json) = 0
    or jsonb_array_length(topic.examples_json) = 0
    or jsonb_array_length(topic.common_mistakes_json) = 0
    or cardinality(topic.related_skill_ids) = 0
  );

update public.vocabulary
set
  gender = coalesce(
    gender,
    case
      when lemma like 'der %' then 'der'
      when lemma like 'die %' then 'die'
      when lemma like 'das %' then 'das'
      else null
    end
  ),
  reflexive = reflexive or lemma like 'sich %',
  updated_at = now()
where status = 'published'
  and (
    (gender is null and (lemma like 'der %' or lemma like 'die %' or lemma like 'das %'))
    or (not reflexive and lemma like 'sich %')
  );

comment on table public.grammar_topics is
  'Published grammar reference content is delivered through the Phase 13 knowledge API.';

comment on table public.vocabulary is
  'Published B1-C2 vocabulary reference content is delivered through the Phase 13 knowledge API.';
