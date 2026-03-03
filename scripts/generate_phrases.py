import json
import os
import random

# Vocab with [Chinese, Pinyin, Japanese]
SUBJECTS = [
    ["我", "Wǒ", "私"], ["你", "Nǐ", "あなた"], ["他", "Tā", "彼"], ["她", "Tā", "彼女"],
    ["我们", "Wǒmen", "私たち"], ["他们", "Tāmen", "彼ら"], ["朋友", "Péngyou", "友達"], ["老师", "Lǎoshī", "先生"],
    ["老板", "Lǎobǎn", "社長"], ["孩子", "Háizi", "子供"]
]

TIME_WORDS = [
    ["今天", "jīntiān", "今日"], ["明天", "míngtiān", "明日"], ["昨天", "zuótiān", "昨日"],
    ["现在", "xiànzài", "今"], ["早上", "zǎoshang", "朝"], ["晚上", "wǎnshang", "夜"],
    ["周末", "zhōumò", "週末"], ["明年", "míngnián", "来年"]
]

PLACES = [
    ["公司", "gōngsī", "会社"], ["学校", "xuéxiào", "学校"], ["餐厅", "cāntīng", "レストラン"],
    ["医院", "yīyuàn", "病院"], ["超市", "chāoshì", "スーパー"], ["家", "jiā", "家"],
    ["中国", "Zhōngguó", "中国"], ["日本", "Rìběn", "日本"], ["机场", "jīchǎng", "空港"]
]

VERB_OBJ = [
    ["吃饭", "chī fàn", "ご飯を食べる", "restaurant"], ["喝咖啡", "hē kāfēi", "コーヒーを飲む", "daily"],
    ["工作", "gōngzuò", "仕事をする", "business"], ["学习", "xuéxí", "勉強する", "culture"],
    ["买东西", "mǎi dōngxi", "買い物をする", "shopping"], ["看电影", "kàn diànyǐng", "映画を見る", "culture"],
    ["坐地铁", "zuò dìtiě", "地下鉄に乗る", "transport"], ["去旅游", "qù lǚyóu", "旅行に行く", "travel"],
    ["休息", "xiūxi", "休む", "health"], ["看医生", "kàn yīshēng", "医者に診てもらう", "health"],
    ["聊天", "liáotiān", "おしゃべりする", "daily"], ["开会", "kāihuì", "会議をする", "business"],
    ["点菜", "diǎn cài", "注文する", "restaurant"], ["结账", "jiézhàng", "会計する", "restaurant"],
    ["打车", "dǎchē", "タクシーに乗る", "transport"]
]

ADJECTIVES = [
    ["好", "hǎo", "良い"], ["忙", "máng", "忙しい"], ["累", "lèi", "疲れている"],
    ["开心", "kāixīn", "嬉しい"], ["贵", "guì", "高い"], ["便宜", "piányi", "安い"],
    ["好吃", "hǎochī", "美味しい"], ["漂亮", "piàoliang", "綺麗だ"], ["远", "yuǎn", "遠い"],
    ["近", "jìn", "近い"], ["方便", "fāngbiàn", "便利だ"]
]

# Grammar templates
def generate_svo(idx):
    s = random.choice(SUBJECTS)
    vo = random.choice(VERB_OBJ)
    return {
        "id": f"phrase_svo_{idx}",
        "chinese": f"{s[0]}{vo[0]}。",
        "pinyin": f"{s[1]} {vo[1]}.",
        "japanese": f"{s[2]}は{vo[2]}。",
        "category": vo[3],
        "level": 1,
        "example": {
            "chinese": f"A: {s[0]}在做什么？ B: {s[0]}{vo[0]}。",
            "pinyin": f"A: {s[1]} zài zuò shénme? B: {s[1]} {vo[1]}.",
            "japanese": f"A: {s[2]}は何をしてるの？ B: {s[2]}は{vo[2]}。"
        },
        "notes": "基本文型（S + V + O）"
    }

def generate_time_svo(idx):
    t = random.choice(TIME_WORDS)
    s = random.choice(SUBJECTS)
    vo = random.choice(VERB_OBJ)
    return {
        "id": f"phrase_time_svo_{idx}",
        "chinese": f"{t[0]}{s[0]}{vo[0]}。",
        "pinyin": f"{t[1]} {s[1]} {vo[1]}.",
        "japanese": f"{t[2]}、{s[2]}は{vo[2]}。",
        "category": vo[3],
        "level": 2,
        "example": {
            "chinese": f"A: {s[0]}{t[0]}做什么？ B: {s[0]}{t[0]}{vo[0]}。",
            "pinyin": f"A: {s[1]} {t[1]} zuò shénme? B: {s[1]} {t[1]} {vo[1]}.",
            "japanese": f"A: {s[2]}は{t[2]}何をするの？ B: {s[2]}は{t[2]}に{vo[2]}。"
        },
        "notes": "時間を表す言葉は主語の前か直後に置きます。"
    }

def generate_place_svo(idx):
    s = random.choice(SUBJECTS)
    p = random.choice(PLACES)
    vo = random.choice(VERB_OBJ)
    return {
        "id": f"phrase_place_svo_{idx}",
        "chinese": f"{s[0]}在{p[0]}{vo[0]}。",
        "pinyin": f"{s[1]} zài {p[1]} {vo[1]}.",
        "japanese": f"{s[2]}は{p[2]}で{vo[2]}。",
        "category": vo[3],
        "level": 2,
        "example": {
            "chinese": f"A: {s[0]}在哪里{vo[0]}？ B: {s[0]}在{p[0]}{vo[0]}。",
            "pinyin": f"A: {s[1]} zài nǎli {vo[1]}? B: {s[1]} zài {p[1]} {vo[1]}.",
            "japanese": f"A: {s[2]}はどこで{vo[2]}？ B: {s[2]}は{p[2]}で{vo[2]}。"
        },
        "notes": "場所を示す前置詞「在（～で）」の文型"
    }

def generate_aux_verb(idx):
    s = random.choice(SUBJECTS)
    aux = random.choice([["想", "xiǎng", "～したい"], ["要", "yào", "～するつもりだ"], ["会", "huì", "～できる"]])
    vo = random.choice(VERB_OBJ)
    return {
        "id": f"phrase_aux_{idx}",
        "chinese": f"{s[0]}{aux[0]}{vo[0]}。",
        "pinyin": f"{s[1]} {aux[1]} {vo[1]}.",
        "japanese": f"{s[2]}は{vo[2]}。 ({aux[2]})",
        "category": vo[3],
        "level": 2,
        "example": {
            "chinese": f"A: {s[0]}{aux[0]}做什么？ B: {s[0]}{aux[0]}{vo[0]}。",
            "pinyin": f"A: {s[1]} {aux[1]} zuò shénme? B: {s[1]} {aux[1]} {vo[1]}.",
            "japanese": f"A: {s[2]}は何{aux[2]}か？ B: {s[2]}は{vo[2]}。"
        },
        "notes": "助動詞（想、要、会）の使い方"
    }

def generate_adj_pred(idx):
    s = random.choice(SUBJECTS)
    adj = random.choice(ADJECTIVES)
    deg = random.choice([["很", "hěn", "とても"], ["非常", "fēicháng", "非常に"], ["不太", "bútài", "あまり～ない"]])
    cat = "emotion" if adj[0] in ["开心", "累", "忙"] else "shopping" if adj[0] in ["贵", "便宜"] else "daily"
    return {
        "id": f"phrase_adj_{idx}",
        "chinese": f"{s[0]}{deg[0]}{adj[0]}。",
        "pinyin": f"{s[1]} {deg[1]} {adj[1]}.",
        "japanese": f"{s[2]}は{deg[2]}{adj[2]}。",
        "category": cat,
        "level": 1,
        "example": {
            "chinese": f"A: {s[0]}怎么样？ B: {s[0]}{deg[0]}{adj[0]}。",
            "pinyin": f"A: {s[1]} zěnme yàng? B: {s[1]} {deg[1]} {adj[1]}.",
            "japanese": f"A: {s[2]}はどう？ B: {s[2]}は{deg[2]}{adj[2]}。"
        },
        "notes": "形容詞述語文。形容詞の前には「很」などの程度副詞が必要です。"
    }

def generate_ba_sentence(idx):
    # ば(把)構文: S + 把 + O + V + complement
    # Simplification for generator
    s = random.choice(SUBJECTS)
    objs = [["手机", "shǒujī", "スマホ"], ["电脑", "diànnǎo", "パソコン"], ["咖啡", "kāfēi", "コーヒー"]]
    o = random.choice(objs)
    verbs = [["拿过来", "ná guòlai", "持ってくる"], ["喝完", "hē wán", "飲み切る"], ["卖掉", "mài diào", "売ってしまう"]]
    v = random.choice(verbs)
    return {
        "id": f"phrase_ba_{idx}",
        "chinese": f"{s[0]}把{o[0]}{v[0]}了。",
        "pinyin": f"{s[1]} bǎ {o[1]} {v[1]} le.",
        "japanese": f"{s[2]}は{o[2]}を{v[2]}た。",
        "category": "daily",
        "level": 3,
        "example": {
            "chinese": f"A: {o[0]}呢？ B: {s[0]}把{o[0]}{v[0]}了。",
            "pinyin": f"A: {o[1]} ne? B: {s[1]} bǎ {o[1]} {v[1]} le.",
            "japanese": f"A: {o[2]}は？ B: {s[2]}が{o[2]}を{v[2]}たよ。"
        },
        "notes": "重要な「把」構文：目的語を動詞の前に引き出します。"
    }

# Generate 3000 phrases!
phrases = []
generators = [generate_svo, generate_time_svo, generate_place_svo, generate_aux_verb, generate_adj_pred, generate_ba_sentence]

for i in range(3000):
    func = random.choice(generators)
    phrases.append(func(i))

# Save them into chunks of 100 phrases each
CHUNK_SIZE = 100
chunks = [phrases[i:i + CHUNK_SIZE] for i in range(0, len(phrases), CHUNK_SIZE)]

output_dir = 'src/data/phrases'
os.makedirs(output_dir, exist_ok=True)

for i, chunk in enumerate(chunks):
    filename = os.path.join(output_dir, f'chunk_{i+1:03d}.json')
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(chunk, f, ensure_ascii=False, indent=2)

print(f"Generated {len(phrases)} phrases across {len(chunks)} files in {output_dir}")
