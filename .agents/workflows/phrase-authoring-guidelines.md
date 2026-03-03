---
description: Guidelines for high-quality Chinese phrase and dictionary generation
---

# Chinese Phrase Generation Guidelines

When generating new Chinese phrases (chunk TSV files) or expanding the dictionary, you MUST adhere to the following strict quality standards. The goal is to provide **meaningful, nuanced, and actually useful language learning content**, rather than generic or algorithmic filler.

## 1. Explanation Quality (Notes / 解説)
The explanation (`notes` column in the TSV or JSON data) is critical for the user to understand *how* and *when* to use the phrase.

**DO NOT USE:**
- Generic templates like "ビジネスからプライベートまで幅広く使える汎用性の高い表現です" (A highly versatile expression that can be used from business to private settings).
- Vague encouragement like "ネイティブがめっちゃ使うから、絶対マスターしようね！" (Natives use this a lot, so be sure to master it!).
- Robotic or meta-text like "新しいフレーズ〇〇です" (This is new phrase...).

**MUST INCLUDE:**
- **Nuance**: What is the specific feeling or tone of the word? (e.g., Is it polite? Casual? Urgent? Sarcastic?)
- **Context/Usage**: In what specific situation would a native speaker actually use this? Who is talking to whom?
- **Collocations (語彙の組み合わせ)**: What verbs, nouns, or adjectives are frequently used with this word?
- **Alternatives**: Are there similar phrases, and how do they differ?

*Example of a GOOD explanation for "走吧" (Let's go):*
> 「走吧」は単に「行く（go）」という意味だけでなく、その場にいる人に対して「出発しよう」「もう出ようか」と行動を促すニュアンスで使われます。「我们走吧（私たち行こう）」のように「我们」と一緒に使われることが非常に多いです。特定の目的地に向かうというより、「この場から離れる」ことに焦点が当たっています。「去吧（行ってきなさい）」とは全く意味が異なるので注意。

## 2. Example Sentences (例文)
- Must be natural, everyday conversations that native speakers would actually have.
- Avoid robotic, overly formal, AI-sounding translations (e.g., "この状況についてですが...").
- Do not use generic proper nouns from textbooks endlessly (e.g., Wang-san, Li-san). If needed, use contextually appropriate names or simply conversational phrasing without names.
- Ensure the conversation flows logically from speaker A to speaker B.

## 3. Dictionary Registration (辞書登録)
When generating new phrases, actively extract the key vocabulary words (nouns, verbs, adjectives, idioms, HSK 1-4 level words) used in those phrases.
These words MUST be added to `src/data/dictionary.json` or cross-referenced to ensure the user can tap and hold them for a definition.
- Include the word as the key, and a clear, concise Japanese translation as the value.

## 4. Characters and Formatting
- Ensure Japanese translations do NOT contain Simplified Chinese characters (e.g., replace 语法 with 文法, 这 with これ).
- Keep text clean of any internal AI reasoning or scaffolding. 

Follow these rules for ALL future phrase generations to maintain the pedagogical value of the application.
