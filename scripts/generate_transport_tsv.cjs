const fs = require('fs');
const path = require('path');

const phrases = [
    {
        chinese: '请给我一张去北京的单程票。',
        pinyin: 'Qǐng gěi wǒ yī zhāng qù Běijīng de dānchéng piào.',
        japanese: '北京までの片道切符をお願いします。',
        ex1_ch: '你好，请给我一张去北京的单程票。',
        ex1_py: 'Nǐhǎo, qǐng gěi wǒ yī zhāng qù Běijīng de dānchéng piào.',
        ex1_jp: 'こんにちは、北京までの片道切符をお願いします。',
        ex2_ch: '好的，请出示您的身份证。',
        ex2_py: 'Hǎo de, qǐng chūshì nín de shēnfènzhèng.',
        ex2_jp: 'はい、身分証をご提示ください。',
        notes: '「单程票」は片道切符のことです。「去[場所]的」で「[場所]へ行く〜」となります。'
    },
    {
        chinese: '到北京的车票多少钱？',
        pinyin: 'Dào Běijīng de chēpiào duōshao qián?',
        japanese: '北京までの運賃はいくらですか？',
        ex1_ch: '请问到北京的车票多少钱？',
        ex1_py: 'Qǐngwèn dào Běijīng de chēpiào duōshao qián?',
        ex1_jp: 'すみません、北京までの切符はいくらですか？',
        ex2_ch: '二等座大概五百块。',
        ex2_py: 'Èrděng zuò dàgài wǔbǎi kuài.',
        ex2_jp: '二等席でだいたい500元です。',
        notes: '「多少钱」で値段を尋ねます。「到[場所]的」で「[場所]までの〜」という意味になります。'
    },
    {
        chinese: '买往返票有打折吗？',
        pinyin: 'Mǎi wǎngfǎn piào yǒu dǎzhé ma?',
        japanese: '往復割引はありますか？',
        ex1_ch: '我打算明天回来。买往返票有打折吗？',
        ex1_py: 'Wǒ dǎsuàn míngtiān huílái. Mǎi wǎngfǎn piào yǒu dǎzhé ma?',
        ex1_jp: '明日戻る予定です。往復切符を買うと割引はありますか？',
        ex2_ch: '不好意思，高铁没有往返优惠。',
        ex2_py: 'Bù hǎoyìsi, gāotiě méiyǒu wǎngfǎn yōuhuì.',
        ex2_jp: '申し訳ありません、高速鉄道には往復割引はありません。',
        notes: '「往返票」は往復切符のこと。「打折」は「割引する」という動詞です。'
    },
    {
        chinese: '有一日票或二十四小时票吗？',
        pinyin: 'Yǒu yī rì piào huò èrshísì xiǎoshí piào ma?',
        japanese: '一日券や24時間券はありますか？',
        ex1_ch: '您好，有一日票或二十四小时票吗？',
        ex1_py: 'Nínhǎo, yǒu yī rì piào huò èrshísì xiǎoshí piào ma?',
        ex1_jp: 'こんにちは、一日乗車券や24時間券はありますか？',
        ex2_ch: '有的，一日票二十块钱。',
        ex2_py: 'Yǒu de, yī rì piào èrshí kuài qián.',
        ex2_jp: 'ありますよ、一日券は20元です。',
        notes: '地下鉄やバスなどで観光客向けの1日乗車券の有無を聞く際に使えます。'
    },
    {
        chinese: '请问在哪个站台坐车？',
        pinyin: 'Qǐngwèn zài nǎge zhàntái zuòchē?',
        japanese: 'どのホームから乗ればいいですか？',
        ex1_ch: '我的车快开了，请问在哪个站台坐车？',
        ex1_py: 'Wǒ de chē kuài kāi le, qǐngwèn zài nǎge zhàntái zuòchē?',
        ex1_jp: 'もうすぐ発車してしまいます、どのホームから乗るんですか？',
        ex2_ch: '五号站台，在这边下楼。',
        ex2_py: 'Wǔ hào zhàntái, zài zhèbiān xiàlóu.',
        ex2_jp: '5番ホームです。ここから階段を降りてください。',
        notes: '「站台」がプラットホームのことです。駅員や案内所に場所を聞きたいときに便利です。'
    },
    {
        chinese: '这张票能坐快车吗？',
        pinyin: 'Zhè zhāng piào néng zuò kuàichē ma?',
        japanese: 'この切符で急行に乗れますか？',
        ex1_ch: '不好意思，这张票能坐快车吗？',
        ex1_py: 'Bù hǎoyìsi, zhè zhāng piào néng zuò kuàichē ma?',
        ex1_jp: 'すみません、この切符で急行電車に乗れますか？',
        ex2_ch: '不行，这只能坐普通列车。',
        ex2_py: 'Bùxíng, zhè zhǐ néng zuò pǔtōng lièchē.',
        ex2_jp: 'ダメです、これは普通列車専用です。',
        notes: '「快车」は急行・快速など速い電車を指します。「能坐〜吗」で「〜に乗れますか？」となります。'
    },
    {
        chinese: '可以免费换乘吗？',
        pinyin: 'Kěyǐ miǎnfèi huànchéng ma?',
        japanese: '無料で乗り換えできますか？',
        ex1_ch: '我想转地铁。可以免费换乘吗？',
        ex1_py: 'Wǒ xiǎng zhuǎn dìtiě. Kěyǐ miǎnfèi huànchéng ma?',
        ex1_jp: '地下鉄に乗り換えたいのですが、無料で乗り換えできますか？',
        ex2_ch: '两小时内换乘是免费的。',
        ex2_py: 'Liǎng xiǎoshí nèi huànchéng shì miǎnfèi de.',
        ex2_jp: '2時間以内の乗り換えなら無料です。',
        notes: '「换乘」が乗り換えの意味です。バスから地下鉄などへ移動する際の料金を確認する表現です。'
    },
    {
        chinese: '这张票可以退吗？',
        pinyin: 'Zhè zhāng piào kěyǐ tuì ma?',
        japanese: 'この切符は払い戻しできますか？',
        ex1_ch: '我临时有事。这张票可以退吗？',
        ex1_py: 'Wǒ línshí yǒushì. Zhè zhāng piào kěyǐ tuì ma?',
        ex1_jp: '急用ができました。この切符は払い戻しできますか？',
        ex2_ch: '可以，但要收百分之二十的手续费。',
        ex2_py: 'Kěyǐ, dàn yào shōu bǎifēn zhī èrshí de shǒuxùfèi.',
        ex2_jp: 'できますが、20%の手数料がかかります。',
        notes: '「退票」はチケットの払い戻し・キャンセルのことです。'
    },
    {
        chinese: '可以刷卡或用手机支付吗？',
        pinyin: 'Kěyǐ shuākǎ huò yòng shǒujī zhīfù ma?',
        japanese: 'カード支払いやスマホ決済は使えますか？',
        ex1_ch: '我没带现金。可以刷卡或用手机支付吗？',
        ex1_py: 'Wǒ méi dài xiànjīn. Kěyǐ shuākǎ huò yòng shǒujī zhīfù ma?',
        ex1_jp: '現金を持っていません。カードやスマホで払えますか？',
        ex2_ch: '没问题，微信或支付宝都可以。',
        ex2_py: 'Méiwèntí, Wēixìn huò Zhīfùbǎo dōu kěyǐ.',
        ex2_jp: '問題ないですよ、WeChatもAlipayも使えます。',
        notes: '中国ではスマホ決済が主流です。「手机支付」は必須フレーズです。'
    },
    {
        chinese: '上车前需要检票吗？',
        pinyin: 'Shàngchē qián xūyào jiǎnpiào ma?',
        japanese: '乗車前に改札は必要ですか？',
        ex1_ch: '请问，上车前需要检票吗？',
        ex1_py: 'Qǐngwèn, shàngchē qián xūyào jiǎnpiào ma?',
        ex1_jp: 'すみません、乗る前に切符の確認は必要ですか？',
        ex2_ch: '对，你需要先刷身份证进站。',
        ex2_py: 'Duì, nǐ xūyào xiān shuā shēnfènzhèng jìnzhàn.',
        ex2_jp: 'はい、まず身分証をかざして改札を通る必要があります。',
        notes: '「检票」は切符を切る・確認するという意味です。駅の改札機を通る前によく使います。'
    },
    {
        chinese: '在哪里可以给交通卡充值？',
        pinyin: 'Zài nǎlǐ kěyǐ gěi jiāotōngkǎ chōngzhí?',
        japanese: '交通ICカードのチャージはどこでできますか？',
        ex1_ch: '我的卡快没钱了。在哪里可以给交通卡充值？',
        ex1_py: 'Wǒ de kǎ kuài méi qián le. Zài nǎlǐ kěyǐ gěi jiāotōngkǎ chōngzhí?',
        ex1_jp: 'カードの残高がなくなりそうです。どこでチャージできますか？',
        ex2_ch: '那边的自动售票机就可以充。',
        ex2_py: 'Nàbiān de zìdòng shòupiàojī jiù kěyǐ chōng.',
        ex2_jp: 'あそこの自動券売機でチャージできますよ。',
        notes: '「充值」は「チャージする」という意味で、ICカードやスマホ代などで使われます。'
    },
    {
        chinese: '这张票的有效期是多久？',
        pinyin: 'Zhè zhāng piào de yǒuxiàoqī shì duōjiǔ?',
        japanese: 'この切符の有効期間はどれくらいですか？',
        ex1_ch: '请问这张票的有效期是多久？',
        ex1_py: 'Qǐngwèn zhè zhāng piào de yǒuxiàoqī shì duōjiǔ?',
        ex1_jp: 'すみません、この切符の有効期間はいつまでですか？',
        ex2_ch: '买票后的二十四小时内有效。',
        ex2_py: 'Mǎipiào hòu de èrshísì xiǎoshí nèi yǒuxiào.',
        ex2_jp: '購入後、24時間以内なら有効です。',
        notes: '「有效期」が有効期限・期間のことです。「多久」は時間や期間の長さを尋ねる疑問詞です。'
    },
    {
        chinese: '有儿童票吗？',
        pinyin: 'Yǒu értóng piào ma?',
        japanese: '子ども運賃はありますか？',
        ex1_ch: '我带了一个五岁的孩子，有儿童票吗？',
        ex1_py: 'Wǒ dài le yí ge wǔ suì de háizi, yǒu értóng piào ma?',
        ex1_jp: '5歳の子供を連れているんですが、子供料金はありますか？',
        ex2_ch: '一米二以下的小孩免费。',
        ex2_py: 'Yī mǐ èr yǐxià de xiǎohái miǎnfèi.',
        ex2_jp: '身長120センチ以下の子供は無料です。',
        notes: '中国でも子ども用運賃があります。身長で基準が設けられていることも多いです。'
    },
    {
        chinese: '有家庭票或团体票吗？',
        pinyin: 'Yǒu jiātíng piào huò tuántǐ piào ma?',
        japanese: 'ファミリー券や団体券はありますか？',
        ex1_ch: '我们一共六个人。有家庭票或团体票吗？',
        ex1_py: 'Wǒmen yígòng liù ge rén. Yǒu jiātíng piào huò tuántǐ piào ma?',
        ex1_jp: '全部で6人います。家族券や団体割引はありますか？',
        ex2_ch: '五人以上可以买团体票，打八折。',
        ex2_py: 'Wǔ rén yǐshàng kěyǐ mǎi tuántǐ piào, dǎ bā zhé.',
        ex2_jp: '5人以上なら団体券が買えます、2割引きになります。',
        notes: '「团体」は団体のこと。複数人で旅行する際に便利な表現です。'
    },
    {
        chinese: '请给我开张收据。',
        pinyin: 'Qǐng gěi wǒ kāi zhāng shōujù.',
        japanese: 'レシートの発行をお願いします。',
        ex1_ch: '我要报销。请给我开张收据。',
        ex1_py: 'Wǒ yào bàoxiāo. Qǐng gěi wǒ kāi zhāng shōujù.',
        ex1_jp: '経費精算したいので、領収書を発行してもらえますか。',
        ex2_ch: '好的，稍等一下。',
        ex2_py: 'Hǎo de, shāoděng yíxià.',
        ex2_jp: 'かしこまりました。少々お待ちください。',
        notes: '「开」は発行する、「收据」はレシートのこと。正式な領収書が欲しいときは发票と言い換えます。'
    },
    {
        chinese: '我买错票了，能改签吗？',
        pinyin: 'Wǒ mǎi cuò piào le, néng gǎi qiān ma?',
        japanese: '切符を間違えました。変更できますか？',
        ex1_ch: '时间不对，我买错票了，能改签吗？',
        ex1_py: 'Shíjiān búdùi, wǒ mǎi cuò piào le, néng gǎi qiān ma?',
        ex1_jp: '時間が違いました。間違えて買ってしまったのですが、変更できますか？',
        ex2_ch: '可以，去那边的人工窗口办理。',
        ex2_py: 'Kěyǐ, qù nàbiān de réngōng chuāngkǒu bànlǐ.',
        ex2_jp: 'できますよ。あちらの有人の窓口で手続きしてください。',
        notes: '「改签」は乗車日時などを変更する手続きのことです。'
    },
    {
        chinese: '闸机没开，能帮我一下吗？',
        pinyin: 'Zhá jī méi kāi, néng bāng wǒ yīxià ma?',
        japanese: '改札が開きませんでした。助けていただけますか？',
        ex1_ch: '不好意思，闸机没开，能帮我一下吗？',
        ex1_py: 'Bù hǎoyìsi, zhá jī méi kāi, néng bāng wǒ yīxià ma?',
        ex1_jp: 'すみません、改札が開きませんでした。助けてもらえますか？',
        ex2_ch: '您的卡可能有问题，给我看看。',
        ex2_py: 'Nín de kǎ kěnéng yǒu wèntí, gěi wǒ kànkan.',
        ex2_jp: 'カードに問題があるのかもしれません、見せてください。',
        notes: '「闸机」は自動改札機のことです。駅員にトラブルを知らせるときに使います。'
    },
    {
        chinese: '刷这个二维码能进站吗？',
        pinyin: 'Shuā zhège èrwéimǎ néng jìnzhàn ma?',
        japanese: 'このQRコードで改札を通れますか？',
        ex1_ch: '请问，刷这个二维码能进站吗？',
        ex1_py: 'Qǐngwèn, shuā zhège èrwéimǎ néng jìnzhàn ma?',
        ex1_jp: 'すみません、このQRコードをかざせば改札内に入れますか？',
        ex2_ch: '可以的，直接把手机放在扫码器上。',
        ex2_py: 'Kěyǐ de, zhíjiē bǎ shǒujī fàng zài sǎomǎqì shàng.',
        ex2_jp: '通れますよ、そのままスマホをスキャンの上にかざしてください。',
        notes: '「进站」は駅の中に入るという意味。「刷二维码」で「QRコードをスキャンする」となります。'
    },
    {
        chinese: '高峰时段有附加费吗？',
        pinyin: 'Gāofēng shíduàn yǒu fùjiā fèi ma?',
        japanese: 'ピーク時間の追加料金はありますか？',
        ex1_ch: '现在叫车，高峰时段有附加费吗？',
        ex1_py: 'Xiànzài jiàochē, gāofēng shíduàn yǒu fùjiā fèi ma?',
        ex1_jp: '今からタクシーを呼ぶと、ピークタイムの割増料金はかかりますか？',
        ex2_ch: '有的，现在打车要比平时贵一点。',
        ex2_py: 'Yǒu de, xiànzài dǎchē yào bǐ píngshí guì yīdiǎn.',
        ex2_jp: 'ありますよ、今はタクシー配車が普段より少し高いです。',
        notes: '「高峰时段」がいわゆるラッシュアワー・ピーク時間。「附加费」は割増料金です。'
    },
    {
        chinese: '谢谢，就这些。',
        pinyin: 'Xièxie, jiù zhèxiē.',
        japanese: 'ありがとうございます。以上で大丈夫です。',
        ex1_ch: '您还需要别的东西吗？',
        ex1_py: 'Nín hái xūyào biéde dōngxi ma?',
        ex1_jp: 'ほかになにか必要なものはありますか？',
        ex2_ch: '不用了，谢谢，就这些。',
        ex2_py: 'Búyòng le, xièxie, jiù zhèxiē.',
        ex2_jp: 'いりません、ありがとう。これで全部です。',
        notes: '「就这些」で「これで全部です」という意味になり、窓口や注文で重宝する締めくくりの言葉です。'
    }
];

let tsvLines = [
    'id\tchinese\tpinyin\tjapanese\tcategory\tlevel\texample1_speaker\texample1_avatar\texample1_expression\texample1_chinese\texample1_pinyin\texample1_japanese\texample2_speaker\texample2_avatar\texample2_expression\texample2_chinese\texample2_pinyin\texample2_japanese\tnotes'
];

const avatarsA = ['me', 'cat'];
const avatarsB = ['dog', 'sensei', 'panda']; let baseId = 1001; phrases.forEach => { const currentId ='phrase_'+ ; const avatarA = avatarsA[index % avatarsA.length]; const avatarB = avatarsB[index % avatarsB.length]; const cols = [ currentId, p.chinese, p.pinyin, p.japanese,'transport',
        '1',
        'A',
        avatarA,
        'normal',
        p.ex1_ch,
        p.ex1_py,
        p.ex1_jp,
        'B',
        avatarB,
        'normal',
        p.ex2_ch,
        p.ex2_py,
        p.ex2_jp,
        p.notes
    ];

    tsvLines.push(cols.join('\t'));
});

const outputPath = path.join(__dirname, '../src/data/tsv/chunk_transport_01.tsv');
fs.writeFileSync(outputPath, tsvLines.join('\n'), 'utf8');

console.log('Successfully generated chunk_transport_01.tsv with ' + phrases.length + ' phrases.');
