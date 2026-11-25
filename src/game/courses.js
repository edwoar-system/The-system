// Courses in the Learn tab: a language learned in small sets. Each set: learn the cards, write them (trace, then
// from memory) where the script needs it, a quiz until every card is right, then a test without mistakes. Passing
// a set unlocks the next one; its cards come back in spaced reviews (1, 2, 4, 7, 15 and 30 days later) so they stick.
// Pure: content and rules only. Progress lives in players/{uid}/courses/{courseId} (lib/courses.js).

// ---- Japanese kana ----
const ROWS = {
  hira: [
    "あa いi うu えe おo", "かka きki くku けke こko", "さsa しshi すsu せse そso", "たta ちchi つtsu てte とto",
    "なna にni ぬnu ねne のno", "はha ひhi ふfu へhe ほho", "まma みmi むmu めme もmo", "やya ゆyu よyo",
    "らra りri るru れre ろro", "わwa をwo んn",
    "がga ぎgi ぐgu げge ごgo", "ざza じji ずzu ぜze ぞzo", "だda ぢji づzu でde どdo", "ばba びbi ぶbu べbe ぼbo", "ぱpa ぴpi ぷpu ぺpe ぽpo",
  ],
};
const parseRow = (row) => row.split(" ").map((x) => [x[0], x.slice(1)]);
const toKata = (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60);

// Sets of about ten: two rows of the table at a time, in the order schools teach them.
const KANA_SETS = [[0, 1], [2, 3], [4, 5], [6, 7, 9], [8], [10, 11], [12, 13, 14]];
function kanaSets(script) {
  return KANA_SETS.map((rows, i) => {
    const items = rows.flatMap((r) => parseRow(ROWS.hira[r])).map(([h, ro]) => {
      const ch = script === "kata" ? toKata(h) : h;
      return { id: `${script}:${ch}`, front: ch, back: ro, say: ch, write: true };
    });
    return { id: `${script}${i + 1}`, stage: script, items };
  });
}

// ---- Words: the first 100, in themes. [word, reading or "", meaning] ----
const THEMES = ["numbers", "people", "time", "food", "places", "nature", "verbs", "describe", "little"];
const THEME_SIZES = [10, 10, 10, 10, 10, 10, 15, 10, 15];
function wordSets(lang, list, readingLabel = null) {
  const sets = [];
  let k = 0;
  THEMES.forEach((theme, ti) => {
    const chunk = list.slice(k, k + THEME_SIZES[ti]);
    k += THEME_SIZES[ti];
    // Themes of 15 are split in two sets, so every set is 10 cards or fewer.
    const parts = chunk.length > 10 ? [chunk.slice(0, 8), chunk.slice(8)] : [chunk];
    parts.forEach((p, pi) => sets.push({
      id: `${lang}-${theme}${parts.length > 1 ? pi + 1 : ""}`,
      stage: "words",
      theme,
      items: p.map(([word, reading, meaning]) => ({ id: `${lang}:${word}`, front: word, reading: reading || null, back: meaning, say: word })),
    }));
  });
  return sets;
}
const W = (s) => s.trim().split("\n").map((l) => l.split("|").map((x) => x.trim()));

const JA_WORDS = W(`
いち|ichi|one
に|ni|two
さん|san|three
よん|yon|four
ご|go|five
ろく|roku|six
なな|nana|seven
はち|hachi|eight
きゅう|kyuu|nine
じゅう|juu|ten
わたし|watashi|I, me
あなた|anata|you
ひと|hito|person
ともだち|tomodachi|friend
かぞく|kazoku|family
ちち|chichi|(my) father
はは|haha|(my) mother
あに|ani|(my) older brother
せんせい|sensei|teacher
がくせい|gakusei|student
いま|ima|now
きょう|kyou|today
あした|ashita|tomorrow
きのう|kinou|yesterday
あさ|asa|morning
ひる|hiru|noon, midday
よる|yoru|night
じかん|jikan|time, hour
しゅうまつ|shuumatsu|weekend
まいにち|mainichi|every day
みず|mizu|water
おちゃ|ocha|tea
ごはん|gohan|rice, a meal
パン|pan|bread
さかな|sakana|fish
にく|niku|meat
やさい|yasai|vegetables
たまご|tamago|egg
くだもの|kudamono|fruit
コーヒー|koohii|coffee
いえ|ie|house
がっこう|gakkou|school
みせ|mise|shop
えき|eki|station
くるま|kuruma|car
でんしゃ|densha|train
ほん|hon|book
かばん|kaban|bag
でんわ|denwa|phone
へや|heya|room
て|te|hand
め|me|eye
あし|ashi|foot, leg
あたま|atama|head
くち|kuchi|mouth
やま|yama|mountain
かわ|kawa|river
うみ|umi|sea
そら|sora|sky
あめ|ame|rain
たべる|taberu|to eat
のむ|nomu|to drink
いく|iku|to go
くる|kuru|to come
みる|miru|to see
きく|kiku|to listen
はなす|hanasu|to speak
よむ|yomu|to read
かく|kaku|to write
ねる|neru|to sleep
おきる|okiru|to wake up
する|suru|to do
わかる|wakaru|to understand
かう|kau|to buy
まつ|matsu|to wait
おおきい|ookii|big
ちいさい|chiisai|small
あたらしい|atarashii|new
ふるい|furui|old (things)
たかい|takai|expensive, tall
やすい|yasui|cheap
いい|ii|good
わるい|warui|bad
あつい|atsui|hot
さむい|samui|cold (weather)
はい|hai|yes
いいえ|iie|no
これ|kore|this
それ|sore|that (near you)
あれ|are|that (over there)
どこ|doko|where
なに|nani|what
だれ|dare|who
いつ|itsu|when
どう|dou|how
ここ|koko|here
すこし|sukoshi|a little
たくさん|takusan|a lot
とても|totemo|very
また|mata|again
`);

const ES_WORDS = W(`
uno||one
dos||two
tres||three
cuatro||four
cinco||five
seis||six
siete||seven
ocho||eight
nueve||nine
diez||ten
yo||I
tú||you
la persona||person
el amigo||friend
la familia||family
el padre||father
la madre||mother
el hermano||brother
el profesor||teacher
el estudiante||student
ahora||now
hoy||today
mañana||tomorrow
ayer||yesterday
la mañana||morning
el mediodía||noon
la noche||night
el tiempo||time
el fin de semana||weekend
cada día||every day
el agua||water
el té||tea
la comida||food, meal
el pan||bread
el pescado||fish (to eat)
la carne||meat
las verduras||vegetables
el huevo||egg
la fruta||fruit
el café||coffee
la casa||house
la escuela||school
la tienda||shop
la estación||station
el coche||car
el tren||train
el libro||book
la bolsa||bag
el teléfono||phone
la habitación||room
la mano||hand
el ojo||eye
el pie||foot
la cabeza||head
la boca||mouth
la montaña||mountain
el río||river
el mar||sea
el cielo||sky
la lluvia||rain
comer||to eat
beber||to drink
ir||to go
venir||to come
ver||to see
escuchar||to listen
hablar||to speak
leer||to read
escribir||to write
dormir||to sleep
despertarse||to wake up
hacer||to do, to make
entender||to understand
comprar||to buy
esperar||to wait
grande||big
pequeño||small
nuevo||new
viejo||old
caro||expensive
barato||cheap
bueno||good
malo||bad
caliente||hot
frío||cold
sí||yes
no||no
esto||this
eso||that
allí||there
dónde||where
qué||what
quién||who
cuándo||when
cómo||how
aquí||here
un poco||a little
mucho||a lot
muy||very
otra vez||again
`);

const FR_WORDS = W(`
un||one
deux||two
trois||three
quatre||four
cinq||five
six||six
sept||seven
huit||eight
neuf||nine
dix||ten
je||I
tu||you
la personne||person
l'ami||friend
la famille||family
le père||father
la mère||mother
le frère||brother
le professeur||teacher
l'étudiant||student
maintenant||now
aujourd'hui||today
demain||tomorrow
hier||yesterday
le matin||morning
midi||noon
la nuit||night
le temps||time
le week-end||weekend
chaque jour||every day
l'eau||water
le thé||tea
le repas||meal
le pain||bread
le poisson||fish
la viande||meat
les légumes||vegetables
l'œuf||egg
le fruit||fruit
le café||coffee
la maison||house
l'école||school
le magasin||shop
la gare||station
la voiture||car
le train||train
le livre||book
le sac||bag
le téléphone||phone
la chambre||room
la main||hand
l'œil||eye
le pied||foot
la tête||head
la bouche||mouth
la montagne||mountain
la rivière||river
la mer||sea
le ciel||sky
la pluie||rain
manger||to eat
boire||to drink
aller||to go
venir||to come
voir||to see
écouter||to listen
parler||to speak
lire||to read
écrire||to write
dormir||to sleep
se réveiller||to wake up
faire||to do, to make
comprendre||to understand
acheter||to buy
attendre||to wait
grand||big
petit||small
nouveau||new
vieux||old
cher||expensive
bon marché||cheap
bon||good
mauvais||bad
chaud||hot
froid||cold
oui||yes
non||no
ceci||this
cela||that
là-bas||over there
où||where
quoi||what
qui||who
quand||when
comment||how
ici||here
un peu||a little
beaucoup||a lot
très||very
encore||again
`);

const DE_WORDS = W(`
eins||one
zwei||two
drei||three
vier||four
fünf||five
sechs||six
sieben||seven
acht||eight
neun||nine
zehn||ten
ich||I
du||you
der Mensch||person
der Freund||friend
die Familie||family
der Vater||father
die Mutter||mother
der Bruder||brother
der Lehrer||teacher
der Student||student
jetzt||now
heute||today
morgen||tomorrow
gestern||yesterday
der Morgen||morning
der Mittag||noon
die Nacht||night
die Zeit||time
das Wochenende||weekend
jeden Tag||every day
das Wasser||water
der Tee||tea
das Essen||food, meal
das Brot||bread
der Fisch||fish
das Fleisch||meat
das Gemüse||vegetables
das Ei||egg
das Obst||fruit
der Kaffee||coffee
das Haus||house
die Schule||school
das Geschäft||shop
der Bahnhof||station
das Auto||car
der Zug||train
das Buch||book
die Tasche||bag
das Telefon||phone
das Zimmer||room
die Hand||hand
das Auge||eye
der Fuß||foot
der Kopf||head
der Mund||mouth
der Berg||mountain
der Fluss||river
das Meer||sea
der Himmel||sky
der Regen||rain
essen||to eat
trinken||to drink
gehen||to go
kommen||to come
sehen||to see
zuhören||to listen
sprechen||to speak
lesen||to read
schreiben||to write
schlafen||to sleep
aufwachen||to wake up
machen||to do, to make
verstehen||to understand
kaufen||to buy
warten||to wait
groß||big
klein||small
neu||new
alt||old
teuer||expensive
billig||cheap
gut||good
schlecht||bad
heiß||hot
kalt||cold
ja||yes
nein||no
dies||this
das||that
dort||there
wo||where
was||what
wer||who
wann||when
wie||how
hier||here
ein bisschen||a little
viel||a lot
sehr||very
wieder||again
`);

const IT_WORDS = W(`
uno||one
due||two
tre||three
quattro||four
cinque||five
sei||six
sette||seven
otto||eight
nove||nine
dieci||ten
io||I
tu||you
la persona||person
l'amico||friend
la famiglia||family
il padre||father
la madre||mother
il fratello||brother
l'insegnante||teacher
lo studente||student
adesso||now
oggi||today
domani||tomorrow
ieri||yesterday
la mattina||morning
il mezzogiorno||noon
la notte||night
il tempo||time
il fine settimana||weekend
ogni giorno||every day
l'acqua||water
il tè||tea
il pasto||meal
il pane||bread
il pesce||fish
la carne||meat
le verdure||vegetables
l'uovo||egg
la frutta||fruit
il caffè||coffee
la casa||house
la scuola||school
il negozio||shop
la stazione||station
la macchina||car
il treno||train
il libro||book
la borsa||bag
il telefono||phone
la camera||room
la mano||hand
l'occhio||eye
il piede||foot
la testa||head
la bocca||mouth
la montagna||mountain
il fiume||river
il mare||sea
il cielo||sky
la pioggia||rain
mangiare||to eat
bere||to drink
andare||to go
venire||to come
vedere||to see
ascoltare||to listen
parlare||to speak
leggere||to read
scrivere||to write
dormire||to sleep
svegliarsi||to wake up
fare||to do, to make
capire||to understand
comprare||to buy
aspettare||to wait
grande||big
piccolo||small
nuovo||new
vecchio||old
caro||expensive
economico||cheap
buono||good
cattivo||bad
caldo||hot
freddo||cold
sì||yes
no||no
questo||this
quello||that
laggiù||over there
dove||where
che cosa||what
chi||who
quando||when
come||how
qui||here
un po'||a little
tanto||a lot
molto||very
di nuovo||again
`);

const PT_WORDS = W(`
um||one
dois||two
três||three
quatro||four
cinco||five
seis||six
sete||seven
oito||eight
nove||nine
dez||ten
eu||I
você||you
a pessoa||person
o amigo||friend
a família||family
o pai||father
a mãe||mother
o irmão||brother
o professor||teacher
o estudante||student
agora||now
hoje||today
amanhã||tomorrow
ontem||yesterday
a manhã||morning
o meio-dia||noon
a noite||night
o tempo||time
o fim de semana||weekend
todos os dias||every day
a água||water
o chá||tea
a comida||food, meal
o pão||bread
o peixe||fish
a carne||meat
os legumes||vegetables
o ovo||egg
a fruta||fruit
o café||coffee
a casa||house
a escola||school
a loja||shop
a estação||station
o carro||car
o trem||train (Brazil)
o livro||book
a bolsa||bag
o telefone||phone
o quarto||room
a mão||hand
o olho||eye
o pé||foot
a cabeça||head
a boca||mouth
a montanha||mountain
o rio||river
o mar||sea
o céu||sky
a chuva||rain
comer||to eat
beber||to drink
ir||to go
vir||to come
ver||to see
escutar||to listen
falar||to speak
ler||to read
escrever||to write
dormir||to sleep
acordar||to wake up
fazer||to do, to make
entender||to understand
comprar||to buy
esperar||to wait
grande||big
pequeno||small
novo||new
velho||old
caro||expensive
barato||cheap
bom||good
mau||bad
quente||hot
frio||cold
sim||yes
não||no
isto||this
isso||that
ali||there
onde||where
o que||what
quem||who
quando||when
como||how
aqui||here
um pouco||a little
bastante||a lot
muito||very
de novo||again
`);

const KO_WORDS = W(`
하나|hana|one (native)
둘|dul|two
셋|set|three
넷|net|four
다섯|daseot|five
여섯|yeoseot|six
일곱|ilgop|seven
여덟|yeodeol|eight
아홉|ahop|nine
열|yeol|ten
저|jeo|I (polite)
너|neo|you (to a friend)
사람|saram|person
친구|chingu|friend
가족|gajok|family
아버지|abeoji|father
어머니|eomeoni|mother
형|hyeong|older brother (said by a man)
선생님|seonsaengnim|teacher
학생|haksaeng|student
지금|jigeum|now
오늘|oneul|today
내일|naeil|tomorrow
어제|eoje|yesterday
아침|achim|morning
점심|jeomsim|noon, lunch
밤|bam|night
시간|sigan|time, hour
주말|jumal|weekend
매일|maeil|every day
물|mul|water
차|cha|tea
밥|bap|rice, a meal
빵|ppang|bread
생선|saengseon|fish (to eat)
고기|gogi|meat
채소|chaeso|vegetables
달걀|dalgyal|egg
과일|gwail|fruit
커피|keopi|coffee
집|jip|house
학교|hakgyo|school
가게|gage|shop
역|yeok|station
자동차|jadongcha|car
기차|gicha|train
책|chaek|book
가방|gabang|bag
전화|jeonhwa|phone
방|bang|room
손|son|hand
눈|nun|eye
발|bal|foot
머리|meori|head
입|ip|mouth
산|san|mountain
강|gang|river
바다|bada|sea
하늘|haneul|sky
비|bi|rain
먹다|meokda|to eat
마시다|masida|to drink
가다|gada|to go
오다|oda|to come
보다|boda|to see
듣다|deutda|to listen
말하다|malhada|to speak
읽다|ikda|to read
쓰다|sseuda|to write
자다|jada|to sleep
일어나다|ireonada|to wake up
하다|hada|to do
이해하다|ihaehada|to understand
사다|sada|to buy
기다리다|gidarida|to wait
크다|keuda|big
작다|jakda|small
새롭다|saeropda|new
오래되다|oraedoeda|old (things)
비싸다|bissada|expensive
싸다|ssada|cheap
좋다|jota|good
나쁘다|nappeuda|bad
덥다|deopda|hot (weather)
춥다|chupda|cold (weather)
네|ne|yes
아니요|aniyo|no
이것|igeot|this
그것|geugeot|that (near you)
저것|jeogeot|that (over there)
어디|eodi|where
뭐|mwo|what
누구|nugu|who
언제|eonje|when
어떻게|eotteoke|how
여기|yeogi|here
조금|jogeum|a little
많이|mani|a lot
아주|aju|very
다시|dasi|again
`);

const ZH_WORDS = W(`
一|yī|one
二|èr|two
三|sān|three
四|sì|four
五|wǔ|five
六|liù|six
七|qī|seven
八|bā|eight
九|jiǔ|nine
十|shí|ten
我|wǒ|I, me
你|nǐ|you
人|rén|person
朋友|péngyou|friend
家人|jiārén|family
爸爸|bàba|dad
妈妈|māma|mum
哥哥|gēge|older brother
老师|lǎoshī|teacher
学生|xuésheng|student
现在|xiànzài|now
今天|jīntiān|today
明天|míngtiān|tomorrow
昨天|zuótiān|yesterday
早上|zǎoshang|morning
中午|zhōngwǔ|noon
晚上|wǎnshang|evening, night
时间|shíjiān|time
周末|zhōumò|weekend
每天|měitiān|every day
水|shuǐ|water
茶|chá|tea
饭|fàn|rice, a meal
面包|miànbāo|bread
鱼|yú|fish
肉|ròu|meat
蔬菜|shūcài|vegetables
鸡蛋|jīdàn|egg
水果|shuǐguǒ|fruit
咖啡|kāfēi|coffee
家|jiā|home
学校|xuéxiào|school
商店|shāngdiàn|shop
车站|chēzhàn|station
汽车|qìchē|car
火车|huǒchē|train
书|shū|book
包|bāo|bag
电话|diànhuà|phone
房间|fángjiān|room
手|shǒu|hand
眼睛|yǎnjing|eye
脚|jiǎo|foot
头|tóu|head
嘴|zuǐ|mouth
山|shān|mountain
河|hé|river
海|hǎi|sea
天空|tiānkōng|sky
雨|yǔ|rain
吃|chī|to eat
喝|hē|to drink
去|qù|to go
来|lái|to come
看|kàn|to look, to see
听|tīng|to listen
说|shuō|to speak
读|dú|to read
写|xiě|to write
睡觉|shuìjiào|to sleep
起床|qǐchuáng|to get up
做|zuò|to do, to make
懂|dǒng|to understand
买|mǎi|to buy
等|děng|to wait
大|dà|big
小|xiǎo|small
新|xīn|new
旧|jiù|old (things)
贵|guì|expensive
便宜|piányi|cheap
好|hǎo|good
坏|huài|bad
热|rè|hot
冷|lěng|cold
是|shì|yes (it is)
不是|bú shì|no (it isn't)
这个|zhège|this
那个|nàge|that
哪里|nǎlǐ|where
什么|shénme|what
谁|shéi|who
什么时候|shénme shíhou|when
怎么|zěnme|how
这里|zhèlǐ|here
一点儿|yìdiǎnr|a little
很多|hěn duō|a lot
很|hěn|very
再|zài|again
谢谢|xièxie|thank you
`);

// ---- Korean letters ----
const HANGUL = [
  ["ㅏ", "a"], ["ㅓ", "eo"], ["ㅗ", "o"], ["ㅜ", "u"], ["ㅡ", "eu"], ["ㅣ", "i"],
  ["ㅐ", "ae"], ["ㅔ", "e"], ["ㅑ", "ya"], ["ㅕ", "yeo"], ["ㅛ", "yo"], ["ㅠ", "yu"],
  ["ㄱ", "g / k"], ["ㄴ", "n"], ["ㄷ", "d / t"], ["ㄹ", "r / l"], ["ㅁ", "m"],
  ["ㅂ", "b / p"], ["ㅅ", "s"], ["ㅇ", "silent / ng"], ["ㅈ", "j"], ["ㅎ", "h"],
  ["ㅊ", "ch"], ["ㅋ", "k"], ["ㅌ", "t"], ["ㅍ", "p"],
];
// Letters are said as a syllable so the phone's voice can read them (ㄱ as 가).
const HANGUL_SAY = { "ㅏ": "아", "ㅓ": "어", "ㅗ": "오", "ㅜ": "우", "ㅡ": "으", "ㅣ": "이", "ㅐ": "애", "ㅔ": "에", "ㅑ": "야", "ㅕ": "여", "ㅛ": "요", "ㅠ": "유",
  "ㄱ": "가", "ㄴ": "나", "ㄷ": "다", "ㄹ": "라", "ㅁ": "마", "ㅂ": "바", "ㅅ": "사", "ㅇ": "아", "ㅈ": "자", "ㅎ": "하", "ㅊ": "차", "ㅋ": "카", "ㅌ": "타", "ㅍ": "파" };
const HANGUL_SETS = [[0, 6], [6, 12], [12, 17], [17, 22], [22, 26]].map(([a, b], i) => ({
  id: `hangul${i + 1}`, stage: "hangul",
  items: HANGUL.slice(a, b).map(([ch, ro]) => ({ id: `hangul:${ch}`, front: ch, back: ro, say: HANGUL_SAY[ch], write: true })),
}));

// ---- The courses ----
export const COURSES = [
  { id: "japanese", name: "Japanese", skill: "japanese", speech: "ja-JP", stages: ["hira", "kata", "words"], sets: [...kanaSets("hira"), ...kanaSets("kata"), ...wordSets("ja", JA_WORDS)] },
  { id: "korean", name: "Korean", skill: "korean", speech: "ko-KR", stages: ["hangul", "words"], sets: [...HANGUL_SETS, ...wordSets("ko", KO_WORDS)] },
  { id: "mandarin", name: "Mandarin Chinese", skill: "mandarin", speech: "zh-CN", stages: ["words"], sets: wordSets("zh", ZH_WORDS) },
  { id: "spanish", name: "Spanish", skill: "spanish", speech: "es-ES", stages: ["words"], sets: wordSets("es", ES_WORDS) },
  { id: "french", name: "French", skill: "french", speech: "fr-FR", stages: ["words"], sets: wordSets("fr", FR_WORDS) },
  { id: "german", name: "German", skill: "german", speech: "de-DE", stages: ["words"], sets: wordSets("de", DE_WORDS) },
  { id: "italian", name: "Italian", skill: "italian", speech: "it-IT", stages: ["words"], sets: wordSets("it", IT_WORDS) },
  { id: "portuguese", name: "Portuguese", skill: "portuguese", speech: "pt-BR", stages: ["words"], sets: wordSets("pt", PT_WORDS) },
];
export const courseById = Object.fromEntries(COURSES.map((c) => [c.id, c]));
export const courseForSkill = (skill) => COURSES.find((c) => c.skill === skill) ?? null;

// ---- Progress rules ----
// progress = { passed: { setId: dayNum }, cards: { itemId: [box, dueDay] } }
export const REVIEW_DAYS = [1, 2, 4, 7, 15, 30]; // after a right answer in box n, it comes back REVIEW_DAYS[n] days later
export const REVIEW_MAX = 20; // cards per review session

export const setPassed = (progress, setId) => progress?.passed?.[setId] != null;
// The set you're on: the first one not passed yet (sets unlock in order).
export function currentSet(course, progress) {
  return course.sets.find((s) => !setPassed(progress, s.id)) ?? null;
}
export const isOpen = (course, progress, setId) => {
  const i = course.sets.findIndex((s) => s.id === setId);
  return i === 0 || setPassed(progress, course.sets[i - 1].id) || setPassed(progress, setId);
};
export const itemById = (course) => Object.fromEntries(course.sets.flatMap((s) => s.items).map((it) => [it.id, it]));

// Cards due for review today, oldest due first.
export function dueCards(course, progress, today) {
  const byId = itemById(course);
  return Object.entries(progress?.cards ?? {}).filter(([id, [, due]]) => due <= today && byId[id])
    .sort((a, b) => a[1][1] - b[1][1]).slice(0, REVIEW_MAX).map(([id]) => byId[id]);
}

// A review answer: right moves the card up a box (longer wait), wrong sends it back to box 0 (tomorrow).
export function reviewCard(card = [0, 0], right, today) {
  const box = right ? Math.min(REVIEW_DAYS.length - 1, card[0] + 1) : 0;
  return [box, today + (right ? REVIEW_DAYS[box] : 1)];
}

// How far along: cards in a passed set count as learned.
export function courseStats(course, progress) {
  const total = course.sets.reduce((a, s) => a + s.items.length, 0);
  const learned = course.sets.filter((s) => setPassed(progress, s.id)).reduce((a, s) => a + s.items.length, 0);
  const passed = course.sets.filter((s) => setPassed(progress, s.id)).length;
  return { total, learned, passed, sets: course.sets.length };
}

// Multiple-choice options for a card: the right answer plus 3 others from the same course.
export function optionsFor(item, pool, field = "back", rand = Math.random) {
  const others = [...new Set(pool.filter((p) => p.id !== item.id).map((p) => p[field]).filter((v) => v !== item[field]))];
  const picks = [];
  while (picks.length < 3 && others.length) picks.push(others.splice(Math.floor(rand() * others.length), 1)[0]);
  const all = [...picks, item[field]];
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  return all;
}
