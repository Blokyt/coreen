// ═══════════════════════════════════════════════════
// DATA (extrait du manuel Kaja, Hanguk! A1)
// ═══════════════════════════════════════════════════
const DATA = {
  consonnes: [
    {l:'ㄱ',r:'g/k',s:'g (gare)'},
    {l:'ㄴ',r:'n',s:'n (nuit)'},
    {l:'ㄷ',r:'d/t',s:'d (dame)'},
    {l:'ㄹ',r:'r/l',s:'r intermédiaire'},
    {l:'ㅁ',r:'m',s:'m (maman)'},
    {l:'ㅂ',r:'b/p',s:'b (beau)'},
    {l:'ㅅ',r:'s/ch',s:'s (salut)'},
    {l:'ㅇ',r:'ø/ng',s:'muette / ng final'},
    {l:'ㅈ',r:'dj',s:'dj (djinn)'},
    {l:'ㅊ',r:'tch',s:'tch (Tchad)'},
    {l:'ㅋ',r:'k',s:'k (camion)'},
    {l:'ㅌ',r:'t',s:'t (table)'},
    {l:'ㅍ',r:'p',s:'p (Paris)'},
    {l:'ㅎ',r:'h',s:'h aspiré'},
  ],
  doubles: [
    {l:'ㄲ',r:'kk',s:'k tendu'},
    {l:'ㄸ',r:'tt',s:'t tendu'},
    {l:'ㅃ',r:'pp',s:'p tendu'},
    {l:'ㅆ',r:'ss',s:'s tendu'},
    {l:'ㅉ',r:'jj',s:'tch tendu'},
  ],
  voyelles: [
    {l:'ㅏ',r:'a'},{l:'ㅑ',r:'ya'},{l:'ㅓ',r:'eo'},{l:'ㅕ',r:'yeo'},
    {l:'ㅗ',r:'o'},{l:'ㅛ',r:'yo'},{l:'ㅜ',r:'ou'},{l:'ㅠ',r:'you'},
    {l:'ㅡ',r:'eu'},{l:'ㅣ',r:'i'},
  ],
  composees: [
    {l:'ㅐ',r:'e',c:'ㅏ+ㅣ'},{l:'ㅒ',r:'ye',c:'ㅑ+ㅣ'},
    {l:'ㅔ',r:'e',c:'ㅓ+ㅣ'},{l:'ㅖ',r:'ye',c:'ㅕ+ㅣ'},
    {l:'ㅘ',r:'wa',c:'ㅗ+ㅏ'},{l:'ㅙ',r:'wé',c:'ㅗ+ㅐ'},
    {l:'ㅚ',r:'wé/ué',c:'ㅗ+ㅣ'},{l:'ㅝ',r:'weo',c:'ㅜ+ㅓ'},
    {l:'ㅞ',r:'wé',c:'ㅜ+ㅔ'},{l:'ㅟ',r:'oui',c:'ㅜ+ㅣ'},
    {l:'ㅢ',r:'eui/i',c:'ㅡ+ㅣ'},
  ],
  batchim: [
    {ph:'k',lets:'ㄱ ㄲ ㅋ',ex:[{kr:'책',fr:'livre'},{kr:'밖',fr:'extérieur'}]},
    {ph:'n',lets:'ㄴ',ex:[{kr:'손',fr:'main'}]},
    {ph:'t',lets:'ㄷ ㅅ ㅆ ㅈ ㅊ ㅌ ㅎ',ex:[{kr:'옷',fr:'vêtement'},{kr:'꽃',fr:'fleur'},{kr:'밑',fr:'en dessous'}]},
    {ph:'l',lets:'ㄹ',ex:[{kr:'달',fr:'lune'}]},
    {ph:'m',lets:'ㅁ',ex:[{kr:'밤',fr:'nuit / châtaigne'}]},
    {ph:'p',lets:'ㅂ ㅍ',ex:[{kr:'밥',fr:'riz cuit'},{kr:'잎',fr:'feuille'}]},
    {ph:'ng',lets:'ㅇ',ex:[{kr:'강',fr:'fleuve'}]},
  ],
  expressions: [
    {fr:"Bonjour.",note:"Le '?' est normal ! En coréen c'est littéralement 'Vous portez-vous bien ?' (안녕 = paix/bien-être). Mais s'utilise comme simple 'bonjour'.",poli:"안녕하세요?",inf:"안녕?",rp:"annyeonghaseyo",ri:"annyeong"},
    {fr:"Enchanté(e).",poli:"만나서 반가워요.",inf:"만나서 반가워.",rp:"mannaseo bangawoyo",ri:"mannaseo bangawo"},
    {fr:"Comment allez-vous ?",poli:"어떻게 지내세요?",inf:"어떻게 지내?",rp:"eotteoke jinaeseyo",ri:"eotteoke jinae"},
    {fr:"Je vais bien.",poli:"잘 지내요.",inf:"잘 지내.",rp:"jal jinaeyo",ri:"jal jinae"},
    {fr:"Merci.",poli:"감사합니다.",inf:"고마워.",rp:"gamsahamnida",ri:"gomawo"},
    {fr:"De rien.",poli:"아니에요.",inf:"아니야.",rp:"anieyo",ri:"aniya"},
    {fr:"Oui.",poli:"네.",inf:"응.",rp:"ne",ri:"eung"},
    {fr:"Non.",poli:"아니요.",inf:"아니.",rp:"aniyo",ri:"ani"},
    {fr:"Bon appétit.",poli:"맛있게 드세요.",inf:"맛있게 먹어.",rp:"masitge deuseyo",ri:"masitge meogeo"},
    {fr:"C'est délicieux.",poli:"맛있어요.",inf:"맛있어.",rp:"masisseoyo",ri:"masisseo"},
    {fr:"Je suis désolé(e).",poli:"죄송합니다.",inf:"미안해.",rp:"joesonghamnida",ri:"mianhae"},
    {fr:"Ce n'est pas grave.",poli:"괜찮아요.",inf:"괜찮아.",rp:"gwaenchanayo",ri:"gwaenchana"},
    {fr:"Au revoir. (on reste, l'autre part)",note:"L'autre 'va', donc on lui dit 'd'aller en paix' (가다 = aller).",poli:"안녕히 가세요.",inf:"안녕!",rp:"annyeonghi gaseyo",ri:"annyeong"},
    {fr:"Au revoir. (on part, l'autre reste)",note:"L'autre 'reste', donc on lui dit de 'rester en paix' (계시다 = rester).",poli:"안녕히 계세요.",inf:"안녕!",rp:"annyeonghi gyeseyo",ri:"annyeong"},
    {fr:"Je ne comprends pas.",poli:"모르겠어요.",inf:"모르겠어.",rp:"moreugeseoyo",ri:"moreugesseo"},
    {fr:"Répétez, s'il vous plaît.",poli:"다시 말해 주세요.",inf:"다시 말해줘.",rp:"dasi malhae juseyo",ri:"dasi malhaejwo"},
    {fr:"Où est... ?",poli:"...이/가 어디에 있어요?",inf:"...이/가 어디에 있어?",rp:"...i/ga eodie isseoyo",ri:"...i/ga eodie isseo"},
    {fr:"Je veux manger...",poli:"...을/를 먹고 싶어요.",inf:"...을/를 먹고 싶어.",rp:"...eul/reul meokgo sipeoyo",ri:"...eul/reul meokgo sipeo"},
    {fr:"Comment on y va ?",poli:"어떻게 가요?",inf:"어떻게 가?",rp:"eotteoke gayo",ri:"eotteoke ga"},
    {fr:"À qui est ... ?",poli:"...이/가 누구 거예요?",inf:"...이/가 누구 거야?",rp:"...i/ga nugu geoyeyo",ri:"...i/ga nugu geoya"},
  ],
  vocab: {
    "Sac / École":[
      {kr:"가방",fr:"sac",rom:"gabang"},
      {kr:"책",fr:"livre",rom:"chaek"},
      {kr:"공책",fr:"cahier",rom:"gongchaek"},
      {kr:"필통",fr:"trousse",rom:"piltong"},
      {kr:"연필",fr:"crayon",rom:"yeonpil"},
      {kr:"볼펜",fr:"stylo",rom:"bolpen"},
      {kr:"지우개",fr:"gomme",rom:"jiugae"},
      {kr:"계산기",fr:"calculatrice",rom:"gyesangi"},
      {kr:"자",fr:"règle",rom:"ja"},
      {kr:"풀",fr:"colle",rom:"pul"},
      {kr:"안경",fr:"lunettes",rom:"angyeong"},
      {kr:"지갑",fr:"portefeuille",rom:"jigap"},
      {kr:"열쇠",fr:"clé",rom:"yeolsoe"},
      {kr:"휴대폰",fr:"téléphone portable",rom:"hyudaepon"},
      {kr:"노트북",fr:"ordinateur portable",rom:"noteubuk"},
    ],
    "Classe / Lycée":[
      {kr:"칠판",fr:"tableau noir",rom:"chilpan"},
      {kr:"화이트보드",fr:"tableau blanc",rom:"hwaiteubodeu"},
      {kr:"칠판 지우개",fr:"efface de tableau",rom:"chilpan jiugae"},
      {kr:"게시판",fr:"panneau d'affichage",rom:"gesipan"},
      {kr:"사물함",fr:"casier",rom:"samulham"},
      {kr:"쓰레기통",fr:"poubelle",rom:"sseuregitong"},
      {kr:"체육관",fr:"gymnase",rom:"cheyukgwan"},
      {kr:"보건실",fr:"infirmerie",rom:"bogeonsil"},
      {kr:"매점",fr:"supérette (lycée)",rom:"maejeom"},
      {kr:"학생 식당",fr:"cantine",rom:"haksaeng sikdang"},
      {kr:"도서관",fr:"bibliothèque",rom:"doseogwan"},
      {kr:"운동장",fr:"terrain sportif",rom:"undongjang"},
      {kr:"수영장",fr:"piscine",rom:"suyeongjang"},
      {kr:"컴퓨터실",fr:"salle informatique",rom:"keompyuteosil"},
      {kr:"음악실",fr:"salle de musique",rom:"eumaksil"},
      {kr:"미술실",fr:"salle d'arts plastiques",rom:"misulsil"},
    ],
    "Chambre / Maison":[
      {kr:"방",fr:"chambre",rom:"bang"},
      {kr:"침대",fr:"lit",rom:"chimdae"},
      {kr:"책상",fr:"bureau (meuble)",rom:"chaeksang"},
      {kr:"의자",fr:"chaise",rom:"uija"},
      {kr:"옷장",fr:"armoire",rom:"otjang"},
      {kr:"창문",fr:"fenêtre",rom:"changmun"},
      {kr:"커튼",fr:"rideau",rom:"keoteun"},
      {kr:"스탠드",fr:"lampe de bureau",rom:"seutaendeu"},
      {kr:"포스터",fr:"affiche / poster",rom:"poseuteo"},
      {kr:"게임기",fr:"console de jeux vidéo",rom:"geimgi"},
      {kr:"거실",fr:"salon",rom:"geosil"},
      {kr:"주방",fr:"cuisine",rom:"jubang"},
      {kr:"화장실",fr:"toilettes",rom:"hwajangsil"},
      {kr:"아파트",fr:"appartement",rom:"apateu"},
      {kr:"실내화",fr:"chaussons d'intérieur",rom:"sillaehwa"},
    ],
    "Nourriture":[
      {kr:"밥",fr:"riz cuit",rom:"bap"},{kr:"쌀",fr:"riz cru",rom:"ssal"},
      {kr:"면",fr:"nouilles",rom:"myeon"},{kr:"고기",fr:"viande",rom:"gogi"},
      {kr:"닭고기",fr:"poulet",rom:"dakgogi"},{kr:"계란",fr:"œuf",rom:"gyeran"},
      {kr:"배추",fr:"chou chinois",rom:"baechu"},{kr:"고추",fr:"piment",rom:"gochu"},
      {kr:"간장",fr:"sauce soja",rom:"ganjang"},{kr:"참기름",fr:"huile de sésame",rom:"chamgireum"},
      {kr:"고추장",fr:"pâte de piment",rom:"gochujang"},{kr:"두부",fr:"tofu",rom:"dubu"},
      {kr:"김치",fr:"kimchi",rom:"gimchi"},{kr:"빵",fr:"pain",rom:"ppang"},
      {kr:"사과",fr:"pomme",rom:"sagwa"},{kr:"바나나",fr:"banane",rom:"banana"},
      {kr:"딸기",fr:"fraise",rom:"ttalgi"},{kr:"당근",fr:"carotte",rom:"danggeun"},
      {kr:"감자",fr:"pomme de terre",rom:"gamja"},{kr:"마늘",fr:"ail",rom:"maneul"},
      {kr:"양파",fr:"oignon",rom:"yangpa"},{kr:"버섯",fr:"champignon",rom:"beoseot"},
    ],
    "Plats coréens":[
      {kr:"비빔밥",fr:"bibimbap",rom:"bibimbap"},
      {kr:"김밥",fr:"kimbap",rom:"gimbap"},
      {kr:"냉면",fr:"nouilles froides",rom:"naengmyeon"},
      {kr:"떡볶이",fr:"tteokbokki",rom:"tteokbokki"},
      {kr:"순두부찌개",fr:"ragoût de tofu soyeux",rom:"sundubu jjigae"},
      {kr:"불고기",fr:"bulgogi",rom:"bulgogi"},
      {kr:"김치볶음밥",fr:"riz sauté au kimchi",rom:"gimchi bokkeum bap"},
      {kr:"공기밥",fr:"bol de riz individuel",rom:"gonggibap"},
      {kr:"약과",fr:"yakgwa (biscuit au miel)",rom:"yakgwa"},
      {kr:"빙수",fr:"bingsu (glace pilée)",rom:"bingsu"},
      {kr:"단팥빵",fr:"danpatbang (brioche haricots)",rom:"danpatbang"},
    ],
    "Boissons & Saveurs":[
      {kr:"물",fr:"eau",rom:"mul"},{kr:"차",fr:"thé",rom:"cha"},
      {kr:"커피",fr:"café",rom:"keopi"},{kr:"주스",fr:"jus",rom:"juseu"},
      {kr:"콜라",fr:"cola",rom:"kolla"},
      {kr:"달다",fr:"sucré(e)",rom:"dalda"},{kr:"맵다",fr:"piquant(e)",rom:"maepda"},
      {kr:"짜다",fr:"salé(e)",rom:"jjada"},{kr:"시다",fr:"acide",rom:"sida"},
      {kr:"쓰다",fr:"amer / amère",rom:"sseuda"},
    ],
    "Activités":[
      {kr:"운동하다",fr:"faire du sport",rom:"undonghada"},
      {kr:"공부하다",fr:"étudier",rom:"gongbuhada"},
      {kr:"요리하다",fr:"cuisiner",rom:"yorihada"},
      {kr:"쇼핑하다",fr:"faire du shopping",rom:"syopinghada"},
      {kr:"수영하다",fr:"nager",rom:"suyeonghada"},
      {kr:"노래하다",fr:"chanter",rom:"noraehada"},
      {kr:"축구하다",fr:"jouer au football",rom:"chukguhada"},
      {kr:"농구하다",fr:"jouer au basket",rom:"nongguhada"},
      {kr:"춤을 추다",fr:"danser",rom:"chumeul chuda"},
      {kr:"책을 읽다",fr:"lire un livre",rom:"chaegul ikda"},
      {kr:"영화를 보다",fr:"regarder un film",rom:"yeonghwareul boda"},
      {kr:"드라마를 보다",fr:"regarder une série",rom:"deuramareul boda"},
      {kr:"음악을 듣다",fr:"écouter de la musique",rom:"eumagul deutda",note:"irrégulier: 듣→들"},
      {kr:"친구를 만나다",fr:"voir ses ami(e)s",rom:"chingureul mannada"},
      {kr:"숙제하다",fr:"faire ses devoirs",rom:"sukjehada"},
    ],
    "Vie quotidienne":[
      {kr:"일어나다",fr:"se lever",rom:"ireonada"},
      {kr:"샤워하다",fr:"se doucher",rom:"syawohada"},
      {kr:"아침을 먹다",fr:"prendre le petit-déjeuner",rom:"achimeul meokda"},
      {kr:"수업을 듣다",fr:"suivre les cours",rom:"suebeul deutda"},
      {kr:"점심을 먹다",fr:"déjeuner",rom:"jeomsimeul meokda"},
      {kr:"저녁을 먹다",fr:"dîner",rom:"jeonyeogeul meokda"},
      {kr:"자다",fr:"dormir / se coucher",rom:"jada"},
    ],
    "Moments / Temps":[
      {kr:"오늘",fr:"aujourd'hui",rom:"oneul"},
      {kr:"지금",fr:"maintenant",rom:"jigeum"},
      {kr:"어제",fr:"hier",rom:"eoje"},
      {kr:"아침",fr:"le matin",rom:"achim"},
      {kr:"점심",fr:"le midi",rom:"jeomsim"},
      {kr:"오후",fr:"l'après-midi",rom:"ohu"},
      {kr:"저녁",fr:"le soir",rom:"jeonyeok"},
      {kr:"밤",fr:"la nuit",rom:"bam"},
      {kr:"주말",fr:"le week-end",rom:"jumal"},
      {kr:"지난 주말",fr:"le week-end dernier",rom:"jinan jumal"},
    ],
    "Jours de la semaine":[
      {kr:"월요일",fr:"lundi",rom:"woryoil"},{kr:"화요일",fr:"mardi",rom:"hwaryoil"},
      {kr:"수요일",fr:"mercredi",rom:"suryoil"},{kr:"목요일",fr:"jeudi",rom:"mogyoil"},
      {kr:"금요일",fr:"vendredi",rom:"geumyoil"},{kr:"토요일",fr:"samedi",rom:"toyoil"},
      {kr:"일요일",fr:"dimanche",rom:"iryoil"},
    ],
    "Sports":[
      {kr:"태권도",fr:"taekwondo",rom:"taegwondo"},
      {kr:"축구",fr:"football",rom:"chukgu"},
      {kr:"농구",fr:"basket",rom:"nonggu"},
      {kr:"수영",fr:"natation",rom:"suyeong"},
      {kr:"테니스",fr:"tennis",rom:"teniseu"},
      {kr:"배드민턴",fr:"badminton",rom:"baedeumiton"},
      {kr:"스키",fr:"ski",rom:"seuki"},
      {kr:"스노우보드",fr:"snowboard",rom:"seunobodeu"},
      {kr:"탁구",fr:"tennis de table",rom:"takgu"},
      {kr:"유도",fr:"judo",rom:"yudo"},
      {kr:"골프",fr:"golf",rom:"golpeu"},
      {kr:"배구",fr:"volley-ball",rom:"baegu"},
      {kr:"야구",fr:"baseball",rom:"yagu"},
      {kr:"조깅",fr:"jogging",rom:"joging"},
      {kr:"스케이트",fr:"patinage",rom:"seukeiteu"},
    ],
    "Famille":[
      {kr:"할머니",fr:"grand-mère",rom:"halmeoni"},
      {kr:"할아버지",fr:"grand-père",rom:"harabeoji"},
      {kr:"어머니",fr:"mère (formel)",rom:"eomeoni"},
      {kr:"아버지",fr:"père (formel)",rom:"abeoji"},
      {kr:"엄마",fr:"maman",rom:"eomma"},
      {kr:"아빠",fr:"papa",rom:"appa"},
      {kr:"오빠",fr:"grand frère (pour une fille)",rom:"oppa"},
      {kr:"형",fr:"grand frère (pour un garçon)",rom:"hyeong"},
      {kr:"언니",fr:"grande sœur (pour une fille)",rom:"eonni"},
      {kr:"누나",fr:"grande sœur (pour un garçon)",rom:"nuna"},
      {kr:"남동생",fr:"petit frère",rom:"namdongsaeng"},
      {kr:"여동생",fr:"petite sœur",rom:"yeodongsaeng"},
      {kr:"아들",fr:"fils",rom:"adeul"},
      {kr:"딸",fr:"fille (enfant)",rom:"ttal"},
      {kr:"사촌",fr:"cousin(e)",rom:"sachon"},
    ],
    "Pays & Nationalités":[
      {kr:"한국",fr:"Corée du Sud",rom:"hanguk"},{kr:"프랑스",fr:"France",rom:"peurangseu"},
      {kr:"일본",fr:"Japon",rom:"ilbon"},{kr:"중국",fr:"Chine",rom:"jungguk"},
      {kr:"미국",fr:"États-Unis",rom:"miguk"},{kr:"독일",fr:"Allemagne",rom:"dogil"},
      {kr:"영국",fr:"Royaume-Uni",rom:"yeongguk"},{kr:"스페인",fr:"Espagne",rom:"seupein"},
      {kr:"이탈리아",fr:"Italie",rom:"itallia"},{kr:"인도",fr:"Inde",rom:"indo"},
      {kr:"브라질",fr:"Brésil",rom:"beurajil"},{kr:"베트남",fr:"Vietnam",rom:"beteunam"},
      {kr:"태국",fr:"Thaïlande",rom:"taeguk"},{kr:"캐나다",fr:"Canada",rom:"kaenada"},
      {kr:"모로코",fr:"Maroc",rom:"moroko"},{kr:"알제리",fr:"Algérie",rom:"aljeri"},
      {kr:"세네갈",fr:"Sénégal",rom:"senegal"},{kr:"호주",fr:"Australie",rom:"hoju"},
      {kr:"사람",fr:"personne (→ nationalité)",rom:"saram",note:"pays + 사람 = nationalité"},
    ],
    "Quartier & Lieux":[
      {kr:"카페",fr:"café",rom:"kape"},{kr:"약국",fr:"pharmacie",rom:"yakguk"},
      {kr:"서점",fr:"librairie",rom:"seojeom"},{kr:"백화점",fr:"grand magasin",rom:"baekhwajeom"},
      {kr:"빵집",fr:"boulangerie",rom:"ppangjip"},{kr:"꽃집",fr:"fleuriste",rom:"kkotjip"},
      {kr:"영화관",fr:"cinéma",rom:"yeonghwagwan"},{kr:"노래방",fr:"noraebang",rom:"noraebang"},
      {kr:"PC방",fr:"PC bang",rom:"PC bang"},{kr:"식당",fr:"restaurant",rom:"sikdang"},
      {kr:"공원",fr:"parc",rom:"gongwon"},{kr:"미술관",fr:"musée",rom:"misulgwan"},
      {kr:"슈퍼마켓",fr:"supermarché",rom:"syupeomaket"},
      {kr:"경찰서",fr:"commissariat",rom:"gyeongchalseo"},
      {kr:"우체국",fr:"poste",rom:"ucheguk"},{kr:"은행",fr:"banque",rom:"eunhaeng"},
    ],
    "Transports":[
      {kr:"지하철",fr:"métro",rom:"jihacheol"},{kr:"버스",fr:"bus",rom:"beoseu"},
      {kr:"기차",fr:"train",rom:"gicha"},{kr:"자동차",fr:"voiture",rom:"jadongcha"},
      {kr:"자전거",fr:"vélo",rom:"jajeongeo"},{kr:"택시",fr:"taxi",rom:"taeksi"},
      {kr:"비행기",fr:"avion",rom:"bihaenggi"},{kr:"오토바이",fr:"moto",rom:"otobai"},
      {kr:"킥보드",fr:"trottinette",rom:"kikbodeu"},{kr:"배",fr:"bateau",rom:"bae"},
      {kr:"편의점",fr:"supérette 24h/24",rom:"pyeonuijeom"},
    ],
    "Pièces & Maison":[
      {kr:"거실",fr:"salon",rom:"geosil"},{kr:"부엌",fr:"cuisine",rom:"bueok"},
      {kr:"침실",fr:"chambre à coucher",rom:"chimsil"},{kr:"화장실",fr:"toilettes",rom:"hwajangsil"},
      {kr:"욕실",fr:"salle de bain",rom:"yoksil"},{kr:"정원",fr:"jardin",rom:"jeongwon"},
      {kr:"현관",fr:"entrée",rom:"hyeongwan"},{kr:"베란다",fr:"balcon / véranda",rom:"beranda"},
      {kr:"서재",fr:"bureau (pièce)",rom:"seojae"},{kr:"차고",fr:"garage",rom:"chago"},
    ],
    "Position & Direction":[
      {kr:"앞",fr:"devant",rom:"ap"},{kr:"뒤",fr:"derrière",rom:"dwi"},
      {kr:"옆",fr:"à côté (de)",rom:"yeop"},{kr:"위",fr:"sur / au-dessus",rom:"wi"},
      {kr:"아래",fr:"sous / en-dessous",rom:"arae"},{kr:"안",fr:"intérieur",rom:"an"},
      {kr:"밖",fr:"extérieur",rom:"bak"},{kr:"오른쪽",fr:"à droite",rom:"oreunjok"},
      {kr:"왼쪽",fr:"à gauche",rom:"oenjok"},
    ],
    "Émotions":[
      {kr:"행복하다",fr:"être heureux",rom:"haengbokhada"},
      {kr:"슬프다",fr:"être triste",rom:"seulpeuda"},
      {kr:"화가 나다",fr:"être en colère",rom:"hwaga nada"},
    ],
    "Couleurs":[
      {kr:"빨간색",fr:"rouge",rom:"ppalgansaek"},
      {kr:"주황색",fr:"orange",rom:"juhwangsaek"},
      {kr:"노란색",fr:"jaune",rom:"noransaek"},
      {kr:"초록색",fr:"vert",rom:"choroksaek"},
      {kr:"파란색",fr:"bleu",rom:"paransaek"},
      {kr:"보라색",fr:"violet",rom:"borasaek"},
      {kr:"분홍색",fr:"rose",rom:"bunhongsaek"},
      {kr:"하얀색",fr:"blanc",rom:"hayansaek"},
      {kr:"검은색",fr:"noir",rom:"geomeunsaek"},
      {kr:"갈색",fr:"marron",rom:"galsaek"},
      {kr:"회색",fr:"gris",rom:"hoesaek"},
    ],
    "Saisons":[
      {kr:"봄",fr:"printemps",rom:"bom"},
      {kr:"여름",fr:"été",rom:"yeoreum"},
      {kr:"가을",fr:"automne",rom:"gaeul"},
      {kr:"겨울",fr:"hiver",rom:"gyeoul"},
    ],
    "Pronoms & Connecteurs":[
      {kr:"나",fr:"je, moi (informel)",rom:"na",note:"나는 = moi (thème)"},
      {kr:"저",fr:"je, moi (poli)",rom:"jeo",note:"저는 = moi (poli)"},
      {kr:"너",fr:"tu, toi (informel)",rom:"neo"},
      {kr:"우리",fr:"nous / mon (famille)",rom:"uri",note:"우리 엄마 = ma maman"},
      {kr:"여러분",fr:"vous (pluriel, poli)",rom:"yeoreobun"},
      {kr:"그리고",fr:"et (entre phrases)",rom:"geurigo"},
      {kr:"그래서",fr:"donc",rom:"geuraeseo"},
      {kr:"하지만",fr:"mais",rom:"hajiman"},
      {kr:"그런데",fr:"mais, or",rom:"geureonde"},
      {kr:"도",fr:"aussi (particule)",rom:"do",note:"나도 = moi aussi"},
    ],
    "Nombres sino-coréens":[
      {kr:"일",fr:"1",rom:"il"},{kr:"이",fr:"2",rom:"i"},
      {kr:"삼",fr:"3",rom:"sam"},{kr:"사",fr:"4",rom:"sa"},
      {kr:"오",fr:"5",rom:"o"},{kr:"육",fr:"6",rom:"yuk"},
      {kr:"칠",fr:"7",rom:"chil"},{kr:"팔",fr:"8",rom:"pal"},
      {kr:"구",fr:"9",rom:"gu"},{kr:"십",fr:"10",rom:"sip"},
      {kr:"백",fr:"100",rom:"baek"},{kr:"천",fr:"1 000",rom:"cheon"},
      {kr:"만",fr:"10 000",rom:"man"},
    ],
    "Nombres coréens natifs":[
      {kr:"하나 (한)",fr:"1",rom:"hana (han)",note:"한 devant classificateur"},
      {kr:"둘 (두)",fr:"2",rom:"dul (du)",note:"두 devant classificateur"},
      {kr:"셋 (세)",fr:"3",rom:"set (se)",note:"세 devant classificateur"},
      {kr:"넷 (네)",fr:"4",rom:"net (ne)",note:"네 devant classificateur"},
      {kr:"다섯",fr:"5",rom:"daseot"},{kr:"여섯",fr:"6",rom:"yeoseot"},
      {kr:"일곱",fr:"7",rom:"ilgop"},{kr:"여덟",fr:"8",rom:"yeodeol"},
      {kr:"아홉",fr:"9",rom:"ahop"},{kr:"열",fr:"10",rom:"yeol"},
      {kr:"스물 (스무)",fr:"20",rom:"seumul (semu)"},
    ],
  },
  grammar: [
    {id:"particule_topic",titre:"Particule thématique 은/는",ch:1,
     explain:"Se place après le sujet/thème de la phrase.",
     regles:[{ctx:"après voyelle",forme:"는",ex_kr:"나는 알리스야.",ex_fr:"Je suis Alice."},
             {ctx:"après consonne",forme:"은",ex_kr:"나영은 한국 사람이야.",ex_fr:"Nayoung est coréenne."}]},
    {id:"copule_informel",titre:"Verbe être informel — ~야 / ~이야",ch:1,
     explain:"Registre informel (amis, personnes plus jeunes). Équivaut à 'c'est / je suis'. En coréen le verbe être s'accorde avec la lettre finale du mot qui le précède.",
     regles:[{ctx:"après voyelle",forme:"야",ex_kr:"알리스야.",ex_rom:"Alliséuya.",ex_fr:"Je m'appelle Alice."},
             {ctx:"après consonne",forme:"이야",ex_kr:"나영이야.",ex_rom:"Nayeongi ya.",ex_fr:"Je m'appelle Nayoung."}]},
    {id:"copule_poli",titre:"Verbe être poli — ~예요 / ~이에요",ch:1,
     explain:"Registre poli (avec les adultes, les inconnus, les professeurs). Même logique : dépend de la consonne/voyelle finale.",
     regles:[{ctx:"après voyelle",forme:"예요",ex_kr:"알리스예요.",ex_rom:"Alliséu yeyo.",ex_fr:"Je suis Alice."},
             {ctx:"après consonne",forme:"이에요",ex_kr:"나영이에요.",ex_rom:"Nayeong ieyo.",ex_fr:"Je suis Nayoung."}]},
    {id:"negation_copule",titre:"Négation du verbe être — ~가/이 아니야",ch:1,
     explain:"Pour dire 'ce n'est pas...' au registre informel. La particule 가 (après voyelle) ou 이 (après consonne) précède 아니야.",
     regles:[{ctx:"après voyelle",forme:"가 아니야",ex_kr:"언니가 아니야.",ex_rom:"Eonni ga aniya.",ex_fr:"Ce n'est pas ma grande sœur."},
             {ctx:"après consonne",forme:"이 아니야",ex_kr:"남동생이 아니야.",ex_rom:"Namdongsaeng i aniya.",ex_fr:"Ce n'est pas mon petit frère."}]},
    {id:"il_y_a",titre:"있다 / 없다 (il y a / il n'y a pas)",ch:2,
     explain:"있다 = exister, avoir. 없다 = ne pas avoir. Au poli, ajouter 요 à la fin : 있어요 / 없어요.",
     exemples:[{kr:"가방에 책하고 공책이 있어.",fr:"Dans le sac, il y a un livre et un cahier."},
               {kr:"학교에 있어요.",fr:"Je suis à l'école."},
               {kr:"수영장이 없어요.",fr:"Il n'y a pas de piscine."}]},
    {id:"particule_ga",titre:"Particule sujet 가/이",ch:2,
     explain:"Marque le sujet grammatical. 가 après voyelle, 이 après consonne. Attention: différent de la particule thématique 은/는.",
     regles:[{ctx:"après voyelle",forme:"가",ex_kr:"열쇠가 있어.",ex_fr:"Il y a des clés."},
             {ctx:"après consonne",forme:"이",ex_kr:"책이 있어.",ex_fr:"Il y a un livre."}]},
    {id:"hago",titre:"하고 (et — entre noms)",ch:2,
     explain:"Conjonction entre noms. Différent de 그리고 (et — entre phrases).",
     exemples:[{kr:"책하고 공책이 있어.",fr:"Il y a un livre et un cahier."},
               {kr:"방에 책상하고 의자가 있어.",fr:"Dans la chambre, il y a un bureau et une chaise."}]},
    {id:"present",titre:"Le présent : terminaisons -아요/-어요",ch:3,
     explain:"1) Supprimer 다 de l'infinitif. 2) Si la dernière voyelle du radical est ㅏ ou ㅗ → ajouter 아요. Sinon → 어요. Les verbes en 하다 → 해요.",
     regles:[{ctx:"ㅏ ou ㅗ finale",forme:"-아요",ex_kr:"가다 → 가요",ex_fr:"aller → je vais"},
             {ctx:"autres voyelles",forme:"-어요",ex_kr:"먹다 → 먹어요",ex_fr:"manger → je mange"},
             {ctx:"verbes en 하다",forme:"→ 해요",ex_kr:"운동하다 → 운동해요",ex_fr:"faire du sport"}]},
    {id:"particule_COD",titre:"Particule COD 을/를",ch:3,
     explain:"Marque l'objet direct. 를 après voyelle, 을 après consonne. Souvent omise à l'oral.",
     regles:[{ctx:"après voyelle",forme:"를",ex_kr:"영화를 봐.",ex_fr:"Je regarde un film."},
             {ctx:"après consonne",forme:"을",ex_kr:"수업을 들어.",ex_fr:"Je suis les cours."}]},
    {id:"particule_lieu_eseo",titre:"에서 : lieu + verbe d'action",ch:3,
     explain:"에서 = 'dans/à' + action. À ne pas confondre avec 에 qui s'utilise avec les verbes d'état.",
     exemples:[{kr:"학교에서 공부해요.",fr:"J'étudie à l'école."},
               {kr:"식당에서 저녁을 먹어.",fr:"Je dîne au restaurant."},
               {kr:"카페에서 음악을 들어.",fr:"J'écoute de la musique au café."}]},
    {id:"negation_an",titre:"La négation : 안 + verbe",ch:3,
     explain:"안 se place directement devant le verbe. Pour les verbes NOM+하다, 안 se met devant 하다.",
     exemples:[{kr:"책을 안 읽어요.",fr:"Je ne lis pas de livre."},
               {kr:"쇼핑 안 해요.",fr:"Je ne fais pas de shopping."},
               {kr:"친구를 안 만나.",fr:"Je ne vois pas mes amis."}]},
    {id:"particule_temps",titre:"Particule de temps 에",ch:3,
     explain:"Se place après un mot de temps (jour, heure, saison) pour dire 'le/à'.",
     exemples:[{kr:"월요일에 축구해요.",fr:"Je joue au football le lundi."},
               {kr:"아침에 샤워해요.",fr:"Je me douche le matin."},
               {kr:"9시에 일어나요.",fr:"Je me lève à 9h."}]},
    {id:"demonstratifs",titre:"Adjectifs démonstratifs — 이 / 그 / 저",ch:4,
     explain:"3 degrés de distance. 이 = proche du locuteur (ci). 그 = loin du locuteur, proche de l'interlocuteur (là). 저 = loin des deux (là-bas). Devant un nom, utilisés seuls ils deviennent 이것/그것/저것.",
     table:[
       {det:"이",usage:"proche de moi",ex_kr:"이 가방",ex_rom:"i gabang",ex_fr:"ce sac-ci"},
       {det:"그",usage:"proche de toi",ex_kr:"그 가방",ex_rom:"geu gabang",ex_fr:"ce sac-là"},
       {det:"저",usage:"loin des deux",ex_kr:"저 가방",ex_rom:"jeo gabang",ex_fr:"ce sac là-bas"},
       {det:"이것",usage:"pronom seul (ci)",ex_kr:"이것은 뭐야?",ex_rom:"igeoseun mwoya?",ex_fr:"Qu'est-ce que c'est ?"},
       {det:"그것",usage:"pronom seul (là)",ex_kr:"그것은 내 거야.",ex_rom:"geugeoseun nae geoya.",ex_fr:"C'est le mien."},
       {det:"저것",usage:"pronom seul (là-bas)",ex_kr:"저것은 학교야.",ex_rom:"jeogeoseun hakgyoya.",ex_fr:"Là-bas c'est l'école."},
     ],
     note:"Pas de genre (pas de masculin/féminin) et pas de pluriel en coréen."},
    {id:"position",titre:"La position : 앞 / 뒤 / 옆 / 위 / 아래...",ch:4,
     explain:"Les mots de position se placent après le nom de référence, suivi de la particule 에 (lieu) ou 에서 (action dans ce lieu).",
     table:[
       {det:"앞",usage:"devant",ex_kr:"서점 앞에 있어.",ex_rom:"seojeom ape isseo.",ex_fr:"C'est devant la librairie."},
       {det:"뒤",usage:"derrière",ex_kr:"학교 뒤에 있어.",ex_rom:"hakgyo dwie isseo.",ex_fr:"C'est derrière l'école."},
       {det:"옆",usage:"à côté (de)",ex_kr:"카페 옆에 있어.",ex_rom:"kape yeope isseo.",ex_fr:"C'est à côté du café."},
       {det:"위",usage:"sur / au-dessus",ex_kr:"책상 위에 있어.",ex_rom:"chaeksang wie isseo.",ex_fr:"C'est sur le bureau."},
       {det:"아래",usage:"sous / en-dessous",ex_kr:"침대 아래에 있어.",ex_rom:"chimde araee isseo.",ex_fr:"C'est sous le lit."},
       {det:"안",usage:"à l'intérieur",ex_kr:"가방 안에 있어.",ex_rom:"gabang ane isseo.",ex_fr:"C'est dans le sac."},
       {det:"밖",usage:"à l'extérieur",ex_kr:"집 밖에 있어.",ex_rom:"jip bake isseo.",ex_fr:"C'est à l'extérieur de la maison."},
       {det:"왼쪽",usage:"à gauche",ex_kr:"왼쪽에 가.",ex_rom:"oenjjoge ga.",ex_fr:"Va à gauche."},
       {det:"오른쪽",usage:"à droite",ex_kr:"오른쪽에 가.",ex_rom:"oreunjjoge ga.",ex_fr:"Va à droite."},
     ]},
    {id:"deplacement_e",titre:"Particule 에 + verbe de déplacement",ch:4,
     explain:"La particule 에 marque la destination ou l'emplacement. Avec les verbes de mouvement (가다, 오다) = direction. Avec 있다/없다 = existence.",
     exemples:[{kr:"서점에 가요.",rom:"seojeome gayo.",fr:"Je vais à la librairie."},
               {kr:"학교에 와.",rom:"hakgyoe wa.",fr:"Viens à l'école."},
               {kr:"편의점이 빵집 앞에 있어요.",rom:"pyeonuijemi ppangjip ape isseoyo.",fr:"La supérette est devant la boulangerie."}],
     note:"⚠️ 에 (direction/lieu d'état) ≠ 에서 (lieu d'action). '학교에 있어' (être à l'école) vs '학교에서 공부해' (étudier à l'école)."},
    {id:"transport_ro",titre:"Moyen de transport — (으)로",ch:4,
     explain:"Pour dire 'en bus', 'à vélo', etc. La particule 로 s'attache au moyen de transport. Règle : consonne finale + 으로 / voyelle finale + 로 / ㄹ finale + 로.",
     regles:[{ctx:"après consonne (sauf ㄹ)",forme:"으로",ex_kr:"버스로 가요.",ex_rom:"beoseuro gayo.",ex_fr:"J'y vais en bus."},
             {ctx:"après voyelle ou ㄹ",forme:"로",ex_kr:"지하철로 가요.",ex_rom:"jihacheolro gayo.",ex_fr:"J'y vais en métro."},
             {ctx:"à pied",forme:"걸어서",ex_kr:"걸어서 가요.",ex_rom:"georeoseo gayo.",ex_fr:"J'y vais à pied."}],
     note:"(으)로 sert aussi à dire 'vers' une direction : 왼쪽으로 가 = Va vers la gauche."},
    {id:"possession_ui",titre:"La possession — 의",ch:4,
     explain:"La particule 의 (prononcée 에) se place entre le possesseur et l'objet possédé, comme 'de' en français. Dans le langage courant, 의 est souvent omis.",
     exemples:[{kr:"언니 거야. / 내 언니 거야.",rom:"eonni geoya. / nae eonni geoya.",fr:"C'est à ma sœur. (거 = la chose de)"},
               {kr:"저 컴퓨터 누구 거야?",rom:"jeo keompyuteo nugu geoya?",fr:"À qui est cet ordinateur ?"},
               {kr:"이 책은 우리 선생님 거예요.",rom:"i chaegeun uri seonsaengnim geoyeyo.",fr:"Ce livre est à notre professeur."}],
     note:"거 = contraction de 것 (chose, truc). Nugu = qui. 내 = mon/ma. 우리 = notre (utilisé aussi pour 'mon/ma' en coréen)."},
    {id:"vouloir",titre:"Vouloir : -고 싶다",ch:5,
     explain:"Pour exprimer un désir. Structure : VERBE (radical) + 고 싶어요 (poli) / 고 싶어 (informel).",
     exemples:[{kr:"뭐 먹고 싶어?",fr:"Qu'est-ce que tu veux manger ?"},
               {kr:"비빔밥 먹고 싶어.",fr:"Je veux manger du bibimbap."},
               {kr:"한국에 가고 싶어요.",fr:"Je veux aller en Corée."}]},
    {id:"fait_de",titre:"Être fait de : ~(으)로 만들어요",ch:5,
     explain:"Pour dire de quoi quelque chose est fait. 로 après voyelle, 으로 après consonne.",
     exemples:[{kr:"이/가 뭐로 만들어요?",fr:"De quoi c'est fait ?"},
               {kr:"쌀로 만들어요.",fr:"C'est fait de riz."},
               {kr:"고기로 만들어요.",fr:"C'est fait de viande."}]},
    {id:"passe",titre:"Le passé : -았어요 / -었어요",ch:6,
     explain:"Supprimer 다. Si dernière voyelle du radical = ㅏ ou ㅗ → -았어요. Sinon → -었어요. Verbes en 하다 → -했어요.",
     regles:[{ctx:"ㅏ ou ㅗ finale",forme:"-았어요",ex_kr:"가다 → 갔어요",ex_fr:"aller → je suis allé(e)"},
             {ctx:"autres voyelles",forme:"-었어요",ex_kr:"먹다 → 먹었어요",ex_fr:"manger → j'ai mangé"},
             {ctx:"하다",forme:"→ -했어요",ex_kr:"쇼핑하다 → 쇼핑했어요",ex_fr:"faire du shopping → j'ai fait"}]},
    {id:"date",titre:"La date : 월 / 일",ch:6,
     explain:"MOIS = nombre sino-coréen + 월. JOUR = nombre sino-coréen + 일. Exceptions : 6월 = 유월, 10월 = 시월.",
     exemples:[{kr:"오늘은 10월 6일이에요.",fr:"Aujourd'hui c'est le 6 octobre."},
               {kr:"1월 1일",fr:"le 1er janvier"},
               {kr:"6월 (유월)",fr:"juin — exception !"},
               {kr:"10월 (시월)",fr:"octobre — exception !"}]},
    {id:"heure",titre:"L'heure : 시 / 분 / 반",ch:6,
     explain:"HEURE = nombre coréen natif + 시. MINUTE = nombre sino-coréen + 분. 반 = demi (30 min).",
     exemples:[{kr:"두 시",fr:"2h"},{kr:"두 시 사십오 분",fr:"2h45"},
               {kr:"아홉 시 반",fr:"9h30"},{kr:"몇 시예요?",fr:"Quelle heure est-il ?"}]},
    {id:"de_a_temps",titre:"De... à... (temps) : 부터 ~ 까지",ch:6,
     explain:"부터 = à partir de / 까지 = jusqu'à. Pour les durées temporelles. (Lieux : 에서~까지)",
     exemples:[{kr:"8시부터 9시까지",fr:"de 8h à 9h"},
               {kr:"1월부터 12월까지",fr:"de janvier à décembre"},
               {kr:"아침 9시부터 저녁 8시까지 서울을 구경했어요.",fr:"De 9h à 20h, j'ai visité Séoul."}]},
    {id:"particule_do",titre:"La particule 도 (aussi)",ch:2,
     explain:"도 remplace les particules 은/는, 이/가 et 을/를 pour dire 'aussi'. Elle s'ajoute directement après le nom.",
     exemples:[{kr:"나도 한국 사람이야.",fr:"Moi aussi, je suis coréen(ne)."},
               {kr:"저도 학생이에요.",fr:"Moi aussi, je suis élève."},
               {kr:"언니도 있어.",fr:"Il y a aussi ma grande sœur."}],
     note:"도 remplace les autres particules : 나는 → 나도, 책이 → 책도, 영화를 → 영화도."},
    {id:"liaison",titre:"Les liaisons (연음법칙)",ch:1,
     explain:"Quand une syllabe se termine par une consonne (받침) et que la syllabe suivante commence par ㅇ, la consonne finale 'glisse' sur la syllabe suivante et se prononce.",
     exemples:[{kr:"한국어",fr:"[한구거] coréen (langue)"},
               {kr:"음악을",fr:"[으마글] la musique (COD)"},
               {kr:"책이",fr:"[채기] le livre (sujet)"}],
     note:"C'est la même logique que les liaisons en français ('les amis' → [lezami])."},
    {id:"particule_lieu_e",titre:"Particule de lieu 에 (état / direction)",ch:2,
     explain:"에 s'utilise avec les verbes d'état (있다/없다) pour indiquer où quelque chose se trouve, et avec les verbes de déplacement (가다/오다) pour la destination.",
     exemples:[{kr:"가방에 책이 있어.",fr:"Il y a un livre dans le sac."},
               {kr:"학교에 있어요.",fr:"Je suis à l'école."},
               {kr:"서점에 가요.",fr:"Je vais à la librairie."}],
     note:"에 = lieu d'état OU destination. 에서 = lieu d'action (voir la règle 에서)."},
  ],
  culture: [
    {icon:"🔤",titre:"Le Hangeul (한글)",body:"Créé en 1443 par le roi Sejong le Grand (dynastie Joseon). Instauré officiellement en 1894. 40 lettres : 14 consonnes de base, 5 doubles, 10 voyelles de base, 11 voyelles composées. Le 9 octobre est la Journée du Hangeul.",mots:[["한글","Hangeul (alphabet)"],["훈민정음","Hunminjeongeum (le livre)"],["받침","consonne finale"],["한글날","Journée du Hangeul"]]},
    {icon:"🏫",titre:"Le lycée en Corée (고등학교)",body:"9h-16h50, 7 cours de 50 min. Certains restent jusqu'à 22h pour l'étude autonome nocturne. Les élèves portent des chaussons d'intérieur et la supérette est très populaire. L'examen de bac est le plus important de la vie : les avions sont interdits pendant les épreuves d'oral !",mots:[["매점","supérette du lycée"],["수능","baccalauréat coréen"],["실내화","chaussons d'intérieur"],["고등학교","lycée"],["시간표","emploi du temps"]]},
    {icon:"🎎",titre:"Les noms coréens",body:"Prénom composé de 2 syllabes. Nom de famille d'une syllabe (김, 이, 박...). En Corée : NOM DE FAMILLE d'abord + prénom. Pour interpeller un proche moins âgé dont le prénom se termine par une consonne : 아 / voyelle : 야.",mots:[["성","nom de famille"],["이름","prénom"],["아 / 야","interpellation amicale"]]},
    {icon:"🎭",titre:"Le Hanbok (한복)",body:"Habit traditionnel coréen, aux couleurs vives, porté pour les grandes occasions. Robe+veste pour les femmes (치마, 저고리), pantalon+veste pour les hommes (바지, 저고리).",mots:[["한복","habit traditionnel"],["설날","Nouvel An lunaire"],["추석","fête des récoltes"],["돌","1er anniversaire"]]},
    {icon:"🏮",titre:"설날 — Nouvel An lunaire",body:"1er jour du calendrier lunaire (jan–fév). Formule de vœu : 새해 복 많이 받으세요 ! (Bonne année !). 3 jours fériés. Le 2e matin : cérémonie aux ancêtres. Révérence rituelle aux aînés qui donnent des étrennes. Au menu : soupe de gâteaux de riz blanc.",mots:[["설날","Nouvel An lunaire"],["새해 복 많이 받으세요","Bonne année !"],["차례","cérémonie aux ancêtres"],["세배","révérence rituelle"],["세뱃돈","étrennes"],["떡국","soupe de riz"]]},
    {icon:"🌾",titre:"추석 — Fête des récoltes",body:"15e jour du 8e mois lunaire (sept–oct). Les familles se réunissent et visitent les tombes des ancêtres. Au menu : gâteaux de riz cuits sur aiguilles de pin. La nuit : danse en cercle (classée UNESCO). Jeu traditionnel à 4 bâtons.",mots:[["추석","fête des récoltes"],["성묘","visite des tombes"],["송편","gâteaux de riz"],["강강술래","danse en cercle (UNESCO)"],["윷놀이","jeu des 4 bâtons"]]},
    {icon:"🐯",titre:"Le Tigre (호랑이)",body:"Animal symbolique de la Corée, omniprésent dans les contes et peintures traditionnelles. Mascotte des JO de Séoul 1988. Proverbe : 호랑이도 제 말 하면 온다 = 'Quand on parle du loup...'",mots:[["호랑이","tigre"],["설화","conte traditionnel"]]},
    {icon:"🌺",titre:"L'Hibiscus (무궁화)",body:"Fleur nationale coréenne. Mugunghwa signifie 'fleur immortelle'. Symbole du Parlement coréen. Représente la persévérance et la résilience du peuple coréen.",mots:[["무궁화","hibiscus (fleur nationale)"]]},
    {icon:"🥋",titre:"Le Taekwondo (태권도)",body:"Art martial coréen basé sur les mains et les pieds (pas d'armes). Classé au patrimoine culturel. Épreuve olympique depuis Sydney 2000.",mots:[["태권도","taekwondo"],["무술","art martial"]]},
    {icon:"🎤",titre:"Le Noraebang (노래방)",body:"'Chambre de la chanson' = karaoké privé en box entre amis. Environ 20€/h. Il existe aussi des 'coin noraebang' à 0,50€ la chanson dans des box minuscules. Très populaire après les cours ou le travail.",mots:[["노래방","chambre de karaoké"],["노래","chanson"],["방","chambre/pièce"]]},
    {icon:"🖥️",titre:"Le PC bang (PC방)",body:"Salle d'ordinateurs ultra-confortable. Environ 1,50€/h, ouverte 24h/24. Grands écrans, tous les jeux, livraison de nourriture possible. Né dans les années 1990 avec StarCraft.",mots:[["PC방","salle de jeux vidéo"],["방","chambre/pièce"]]},
    {icon:"📸",titre:"인생네컷 (Photos à 4 poses)",body:"Photomatons coréens avec accessoires et fonds variés. 4 à 6 photos pour environ 4€. Activité classique entre amis, souvenir incontournable. 인생 = vie / 네 = quatre / 컷 = photo.",mots:[["인생네컷","photos 4 poses"],["인생","vie"],["네","quatre"]]},
    {icon:"🏙️",titre:"Quartiers de Séoul",body:"북촌 (Bukchon) : Corée traditionnelle, palais, maisons hanok. 홍대 (Hongdae) : musique, danse, jeunes artistes. 강남 (Gangnam) : affaires, K-pop. 청계천 : fleuve urbain aménagé. Grands marchés : Namdaemun, Dongdaemun, Gwangjang.",mots:[["북촌","Bukchon (quartier hanok)"],["홍대","Hongdae (quartier artiste)"],["강남","Gangnam"],["청계천","fleuve en ville"]]},
    {icon:"🍱",titre:"Le repas coréen traditionnel",body:"Un repas coréen classique se compose de riz, d'une soupe et de plusieurs plats d'accompagnement servis simultanément (pas en ordre comme en France). Tous les plats sont sur la table en même temps.",mots:[["밥","riz cuit"],["국","soupe"],["반찬","plats d'accompagnement"],["식당","restaurant / cantine"]]},
    {icon:"🎉",titre:"Fêtes nationales (국경일)",body:"삼일절 1 mars (Mouvement indépendance 1919). 어린이날 5 mai (Fête des enfants). 현충일 6 juin (Commémoration militaire). 광복절 15 août (Libération 1945). 개천절 3 oct (Fondation de la Corée). 한글날 9 oct (alphabet). 크리스마스 25 déc.",mots:[["국경일","fête nationale"],["삼일절","Mouvement indépendance"],["광복절","Libération"],["한글날","Journée Hangeul"],["어린이날","Fête des enfants"]]},
    {icon:"✊",titre:"가위바위보 (Pierre-feuille-ciseaux)",body:"Le jeu classique existe aussi en Corée ! On dit '가위 바위 보 !' (ga-wi ba-wi bo) en montrant sa main. 가위 = ciseaux, 바위 = pierre, 보 = feuille (enveloppe). Les Coréens l'utilisent constamment pour trancher un choix. Les enfants y jouent dans la cour et les adultes aussi, très naturellement !",mots:[["가위","ciseaux"],["바위","pierre"],["보","feuille (enveloppe)"]]},
    {icon:"🔢",titre:"Les classificateurs (수량 단위)",body:"En coréen, pour compter on utilise des 'classificateurs' entre le nombre et le nom (comme 'une feuille de papier' en français). Chaque type d'objet a son classificateur : 개 (objet quelconque), 그릇 (bol), 숟가락 (cuillère), 봉지 (sachet/paquet), 장 (feuille de papier), 명/사람 (personne), 마리 (animal), 권 (livre), 잔 (tasse/verre). Les nombres coréens natifs (하나→한, 둘→두, 셋→세, 넷→네) se contractent devant un classificateur.",mots:[["개","objet (général)"],["그릇","bol"],["명","personne"],["마리","animal"],["잔","tasse/verre"],["장","feuille"]]},
  ],
  verbes: [
    {inf:"하다",fr:"faire",poli:"해요",inf_:"해",passe:"했어요",rom:"hada"},
    {inf:"가다",fr:"aller",poli:"가요",inf_:"가",passe:"갔어요",rom:"gada"},
    {inf:"오다",fr:"venir",poli:"와요",inf_:"와",passe:"왔어요",rom:"oda"},
    {inf:"있다",fr:"être / avoir / exister",poli:"있어요",inf_:"있어",passe:"있었어요",rom:"itda"},
    {inf:"없다",fr:"ne pas avoir",poli:"없어요",inf_:"없어",passe:"없었어요",rom:"eopda"},
    {inf:"먹다",fr:"manger",poli:"먹어요",inf_:"먹어",passe:"먹었어요",rom:"meokda"},
    {inf:"마시다",fr:"boire",poli:"마셔요",inf_:"마셔",passe:"마셨어요",rom:"masida"},
    {inf:"보다",fr:"regarder / voir",poli:"봐요",inf_:"봐",passe:"봤어요",rom:"boda"},
    {inf:"읽다",fr:"lire",poli:"읽어요",inf_:"읽어",passe:"읽었어요",rom:"ikda"},
    {inf:"듣다",fr:"écouter",poli:"들어요",inf_:"들어",passe:"들었어요",rom:"deutda",note:"irrégulier: 듣→들"},
    {inf:"자다",fr:"dormir",poli:"자요",inf_:"자",passe:"잤어요",rom:"jada"},
    {inf:"공부하다",fr:"étudier",poli:"공부해요",inf_:"공부해",passe:"공부했어요",rom:"gongbuhada"},
    {inf:"운동하다",fr:"faire du sport",poli:"운동해요",inf_:"운동해",passe:"운동했어요",rom:"undonghada"},
    {inf:"쇼핑하다",fr:"faire du shopping",poli:"쇼핑해요",inf_:"쇼핑해",passe:"쇼핑했어요",rom:"syopinghada"},
    {inf:"놀다",fr:"s'amuser / jouer",poli:"놀아요",inf_:"놀아",passe:"놀았어요",rom:"nolda"},
    {inf:"추다",fr:"danser",poli:"춰요",inf_:"춰",passe:"췄어요",rom:"chuda"},
    {inf:"노래하다",fr:"chanter",poli:"노래해요",inf_:"노래해",passe:"노래했어요",rom:"noraehada"},
    {inf:"샤워하다",fr:"se doucher",poli:"샤워해요",inf_:"샤워해",passe:"샤워했어요",rom:"syawohada"},
    {inf:"일어나다",fr:"se lever",poli:"일어나요",inf_:"일어나",passe:"일어났어요",rom:"ireonada"},
    {inf:"축구하다",fr:"jouer au football",poli:"축구해요",inf_:"축구해",passe:"축구했어요",rom:"chukguhada"},
    {inf:"수영하다",fr:"nager",poli:"수영해요",inf_:"수영해",passe:"수영했어요",rom:"suyeonghada"},
    {inf:"타다",fr:"prendre (transport)",poli:"타요",inf_:"타",passe:"탔어요",rom:"tada"},
    {inf:"만들다",fr:"fabriquer / préparer",poli:"만들어요",inf_:"만들어",passe:"만들었어요",rom:"mandeulda"},
    {inf:"찍다",fr:"prendre en photo",poli:"찍어요",inf_:"찍어",passe:"찍었어요",rom:"jjikda"},
    {inf:"사다",fr:"acheter",poli:"사요",inf_:"사",passe:"샀어요",rom:"sada"},
    {inf:"쓰다",fr:"écrire / utiliser",poli:"써요",inf_:"써",passe:"썼어요",rom:"sseuda"},
    {inf:"요리하다",fr:"cuisiner",poli:"요리해요",inf_:"요리해",passe:"요리했어요",rom:"yorihada"},
    {inf:"여행하다",fr:"voyager",poli:"여행해요",inf_:"여행해",passe:"여행했어요",rom:"yeohaenghada"},
    {inf:"좋아하다",fr:"aimer (apprécier)",poli:"좋아해요",inf_:"좋아해",passe:"좋아했어요",rom:"joahada"},
    {inf:"싫어하다",fr:"détester",poli:"싫어해요",inf_:"싫어해",passe:"싫어했어요",rom:"sireohada"},
    {inf:"숙제하다",fr:"faire ses devoirs",poli:"숙제해요",inf_:"숙제해",passe:"숙제했어요",rom:"sukjehada"},
    {inf:"만나다",fr:"rencontrer / voir",poli:"만나요",inf_:"만나",passe:"만났어요",rom:"mannada"},
  ],
};

// ═══════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick')?.includes("'"+id+"'")) n.classList.add('active');
  });
  if (id === 'vocab') renderVocab('all', '');
  if (id === 'grammar') renderGrammar(0);
  if (id === 'culture') renderCulture();
  if (id === 'expressions') renderExpressions();
  if (id === 'hangeul') renderHangeul();
  if (id === 'verbes') renderVerbes('');
}

// ═══════════════════════════════════════════════════
// HANGEUL
// ═══════════════════════════════════════════════════
function renderHangeul() {
  const cg = document.getElementById('consonnes-grid');
  cg.innerHTML = DATA.consonnes.map(c => `
    <div class="hangeul-cell">
      <div class="hg-letter">${c.l}</div>
      <div class="hg-rom">${c.r}</div>
      <div class="hg-fr">${c.s}</div>
    </div>`).join('');

  document.getElementById('doubles-grid').innerHTML = DATA.doubles.map(c => `
    <div class="hangeul-cell double">
      <div class="hg-letter">${c.l}</div>
      <div class="hg-rom">${c.r}</div>
      <div class="hg-fr">${c.s}</div>
    </div>`).join('');

  document.getElementById('voyelles-grid').innerHTML = DATA.voyelles.map(v => `
    <div class="hangeul-cell">
      <div class="hg-letter">${v.l}</div>
      <div class="hg-rom">${v.r}</div>
    </div>`).join('');

  document.getElementById('composees-grid').innerHTML = DATA.composees.map(v => `
    <div class="hangeul-cell composee">
      <div class="hg-letter">${v.l}</div>
      <div class="hg-rom">${v.r}</div>
      <div class="hg-fr">${v.c}</div>
    </div>`).join('');

  document.getElementById('batchim-tbody').innerHTML = DATA.batchim.map(b => `
    <tr>
      <td class="ph">[${b.ph}]</td>
      <td class="letters">${b.lets}</td>
      <td>${b.ex.map(e=>`<strong class="kr" style="color:var(--cream)">${e.kr}</strong> <span style="color:var(--text2);font-size:12px">${e.fr}</span>`).join(' · ')}</td>
    </tr>`).join('');

  // Mnémotechniques
  const mnemos = [
    {l:'ㄱ',r:'g/k',tip:'Ressemble à un angle / coin. Pense à un Coin de table.'},
    {l:'ㄴ',r:'n',tip:'Ressemble à un L retourné. Pense à un Nez de profil.'},
    {l:'ㄷ',r:'d/t',tip:'Comme un ㄴ avec un toit. Pense à une Door (porte).'},
    {l:'ㄹ',r:'r/l',tip:'Ressemble à un 2 ou un escalier. R/L comme un escalier qui roule.'},
    {l:'ㅁ',r:'m',tip:'Un carré = une bouche fermée. La bouche se ferme pour faire M.'},
    {l:'ㅂ',r:'b/p',tip:'Ressemble à un seau (Bucket). Les deux pieds du B.'},
    {l:'ㅅ',r:'s',tip:'Ressemble à un chapeau pointu / un arbre. S comme Sapin.'},
    {l:'ㅇ',r:'ø/ng',tip:'Un cercle = zéro son (muet au début). Comme un anneau.'},
    {l:'ㅈ',r:'dj',tip:'Ressemble à ㅅ avec un chapeau. Dj comme un DJ avec un chapeau.'},
    {l:'ㅊ',r:'tch',tip:'Un ㅈ avec un trait en plus = souffle en plus (aspirée).'},
    {l:'ㅋ',r:'k',tip:'Un ㄱ avec un trait = plus de souffle. K aspiré.'},
    {l:'ㅌ',r:'t',tip:'Un ㄷ avec un trait = plus de souffle. T aspiré.'},
    {l:'ㅍ',r:'p',tip:'Comme une porte à deux battants = P aspiré.'},
    {l:'ㅎ',r:'h',tip:'Ressemble à un bonhomme avec un chapeau. H comme Hello !'},
  ];
  document.getElementById('mnemo-grid').innerHTML = mnemos.map(m => `
    <div class="vocab-card" style="cursor:default">
      <div class="vc-kr" style="font-size:36px;text-align:center">${m.l}</div>
      <div class="vc-rom" style="text-align:center;font-size:13px;color:var(--gold)">[${m.r}]</div>
      <div style="font-size:12px;color:var(--text2);margin-top:8px;line-height:1.5">${m.tip}</div>
    </div>`).join('');
}

function switchHangeulTab(tab) {
  document.querySelectorAll('.hangeul-section').forEach(s => s.style.display='none');
  document.getElementById('hg-'+tab).style.display = 'block';
  document.querySelectorAll('#page-hangeul .tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
}

// ═══════════════════════════════════════════════════
// VOCAB
// ═══════════════════════════════════════════════════
let currentCat = 'all', currentSearch = '';
const CAT_ICONS = {
  "Sac / École":"🎒","Classe / Lycée":"🏫","Chambre / Maison":"🏠",
  "Nourriture":"🥬","Plats coréens":"🍱","Boissons & Saveurs":"🍵",
  "Activités":"🏃","Vie quotidienne":"⏰","Moments / Temps":"🕐",
  "Jours de la semaine":"📅","Sports":"⚽","Famille":"👨‍👩‍👧",
  "Pays & Nationalités":"🌍","Quartier & Lieux":"🏙️","Transports":"🚇",
  "Pièces & Maison":"🏡","Position & Direction":"🧭","Émotions":"💝",
  "Couleurs":"🎨","Saisons":"🌸","Pronoms & Connecteurs":"🗣️",
  "Nombres sino-coréens":"🔢","Nombres coréens natifs":"🔢",
};

function renderVocab(cat, search) {
  // Build category buttons
  const cbContainer = document.getElementById('cat-buttons');
  cbContainer.innerHTML = Object.keys(DATA.vocab).map(c =>
    `<button class="cat-btn${currentCat===c?' active':''}" onclick="setCat('${c}')">${CAT_ICONS[c]||''} ${c}</button>`
  ).join('');

  let items = [];
  if (cat === 'all') {
    Object.entries(DATA.vocab).forEach(([catName, words]) => {
      words.forEach(w => items.push({...w, cat: catName}));
    });
  } else {
    (DATA.vocab[cat]||[]).forEach(w => items.push({...w, cat: cat}));
  }

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(i =>
      i.kr.includes(search) ||
      i.fr.toLowerCase().includes(q) ||
      (i.rom||'').toLowerCase().includes(q)
    );
  }

  const grid = document.getElementById('vocab-grid');
  const empty = document.getElementById('vocab-empty');
  if (!items.length) { grid.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display = 'none';
  grid.innerHTML = items.map(i => `
    <div class="vocab-card">
      <div class="vc-kr">${i.kr}</div>
      <div class="vc-rom">${i.rom||''}</div>
      <div class="vc-fr">${i.fr}</div>
      ${i.note ? `<div class="vc-note">${i.note}</div>` : ''}
      <div class="vc-tag">${i.cat}</div>
    </div>`).join('');
}

function setCat(cat) {
  currentCat = cat;
  document.querySelectorAll('.vocab-controls .cat-btn, #cat-buttons .cat-btn').forEach(b => b.classList.remove('active'));
  renderVocab(cat, currentSearch);
  // Reactivate the right button
  document.querySelectorAll('#cat-buttons .cat-btn').forEach(b => {
    if (b.textContent.trim().includes(cat) || (cat==='all' && b.textContent==='Tout')) b.classList.add('active');
  });
  if (cat === 'all') document.querySelector('.vocab-controls .cat-btn').classList.add('active');
}

function filterVocab(q) {
  currentSearch = q;
  renderVocab(currentCat, q);
}

// ═══════════════════════════════════════════════════
// EXPRESSIONS
// ═══════════════════════════════════════════════════
function renderExpressions() {
  document.getElementById('expr-grid').innerHTML = DATA.expressions.map(e => `
    <div class="expr-card">
      <div class="ec-fr">${e.fr}</div>
      ${e.note ? `<div class="ec-note">${e.note}</div>` : ''}
      <div class="ec-row">
        <div class="ec-label-col">
          <span class="ec-badge poli">Poli</span>
        </div>
        <div class="ec-content-col">
          <div class="ec-poli">${e.poli}</div>
          <div class="ec-rom">${e.rp||''}</div>
        </div>
      </div>
      <div class="ec-row" style="margin-top:8px">
        <div class="ec-label-col">
          <span class="ec-badge inf">Informel</span>
        </div>
        <div class="ec-content-col">
          <div class="ec-inf">${e.inf}</div>
          <div class="ec-rom">${e.ri||''}</div>
        </div>
      </div>
    </div>`).join('');
}

// ═══════════════════════════════════════════════════
// GRAMMAR
// ═══════════════════════════════════════════════════
let grammarFilter = 0;
function renderGrammar(ch) {
  grammarFilter = ch;
  document.querySelectorAll('#grammar-tabs .tab').forEach((t,i) => {
    t.classList.toggle('active', i === ch);
  });
  const items = ch === 0 ? DATA.grammar : DATA.grammar.filter(g => g.ch === ch);
  document.getElementById('grammar-list').innerHTML = items.map(g => `
    <div class="grammar-item" id="gi-${g.id}">
      <div class="grammar-header" onclick="toggleGrammar('${g.id}')">
        <span class="grammar-chap">Chap. ${g.ch}</span>
        <span class="grammar-title">${g.titre}</span>
        <span class="grammar-arrow">›</span>
      </div>
      <div class="grammar-body">
        <p class="grammar-explain">${g.explain}</p>
        ${(g.regles||[]).length ? `
          <table class="rules-table">
            <thead><tr><th>Contexte</th><th>Forme</th><th>Coréen</th><th>Romanisation</th><th>Traduction</th></tr></thead>
            <tbody>
              ${g.regles.map(r => `<tr>
                <td style="color:var(--text2);font-size:12px">${r.ctx}</td>
                <td class="kr" style="color:var(--gold2);font-size:16px">${r.forme}</td>
                <td class="kr" style="font-size:14px">${r.ex_kr}</td>
                <td style="color:var(--text2);font-size:11px;font-style:italic">${r.ex_rom||''}</td>
                <td style="color:var(--text2);font-size:12px;font-style:italic">${r.ex_fr}</td>
              </tr>`).join('')}
            </tbody>
          </table>` : ''}
        ${(g.table||[]).length > 0 ? `
          <table class="rules-table">
            <thead><tr><th>Déterminant</th><th>Usage</th><th>Coréen</th><th>Romanisation</th><th>Traduction</th></tr></thead>
            <tbody>
              ${g.table.map(r => `<tr>
                <td class="kr" style="color:var(--gold2);font-size:18px">${r.det}</td>
                <td style="color:var(--text2);font-size:12px">${r.usage}</td>
                <td class="kr" style="font-size:13px">${r.ex_kr}</td>
                <td style="color:var(--text2);font-size:11px;font-style:italic">${r.ex_rom||''}</td>
                <td style="color:var(--text2);font-size:12px;font-style:italic">${r.ex_fr}</td>
              </tr>`).join('')}
            </tbody>
          </table>` : ''}
        ${(g.exemples||[]).map(e => `
          <div class="example-box">
            <div class="ex-kr">${e.kr}</div>
            ${e.rom ? `<div class="ex-rom">${e.rom}</div>` : ''}
            <div class="ex-fr">${e.fr}</div>
          </div>`).join('')}
        ${g.note ? `<div class="grammar-note">${g.note}</div>` : ''}
      </div>
    </div>`).join('');
}

function filterGrammar(ch) { renderGrammar(ch); }

function toggleGrammar(id) {
  const el = document.getElementById('gi-'+id);
  el.classList.toggle('open');
}

// ═══════════════════════════════════════════════════
// VERBES
// ═══════════════════════════════════════════════════
function renderVerbes(search) {
  let items = DATA.verbes;
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(v =>
      v.inf.includes(search) || v.fr.toLowerCase().includes(q) || (v.rom||'').toLowerCase().includes(q)
    );
  }
  document.getElementById('verbes-grid').innerHTML = items.map(v => `
    <div class="vocab-card" style="cursor:default">
      <div class="vc-kr" style="font-size:22px;margin-bottom:4px">${v.inf}</div>
      <div class="vc-rom">${v.rom||''}</div>
      <div class="vc-fr" style="font-size:14px;font-weight:500;margin-bottom:10px">${v.fr}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
        <div style="background:var(--ink2);padding:6px 8px;border-radius:4px">
          <span style="color:var(--blue);font-size:10px;text-transform:uppercase;letter-spacing:0.5px">Poli</span><br>
          <span class="kr" style="color:var(--cream);font-size:15px">${v.poli}</span>
        </div>
        <div style="background:var(--ink2);padding:6px 8px;border-radius:4px">
          <span style="color:var(--green);font-size:10px;text-transform:uppercase;letter-spacing:0.5px">Informel</span><br>
          <span class="kr" style="color:var(--cream);font-size:15px">${v.inf_}</span>
        </div>
        <div style="background:var(--ink2);padding:6px 8px;border-radius:4px;grid-column:span 2">
          <span style="color:var(--purple);font-size:10px;text-transform:uppercase;letter-spacing:0.5px">Passé (poli)</span><br>
          <span class="kr" style="color:var(--cream);font-size:15px">${v.passe}</span>
        </div>
      </div>
      ${v.note ? `<div class="vc-note" style="margin-top:8px">${v.note}</div>` : ''}
    </div>`).join('');
}
function filterVerbes(q) { renderVerbes(q); }

// ═══════════════════════════════════════════════════
// CULTURE
// ═══════════════════════════════════════════════════
function renderCulture() {
  document.getElementById('culture-grid').innerHTML = DATA.culture.map(c => `
    <div class="culture-card">
      <div class="cc-icon">${c.icon}</div>
      <div class="cc-title">${c.titre}</div>
      <div class="cc-body">${c.body}</div>
      <div class="cc-key">${c.mots.map(m=>`<span class="cc-tag"><span class="cc-tag-kr">${m[0]}</span><span class="cc-tag-fr">${m[1]}</span></span>`).join('')}</div>
    </div>`).join('');
}

// ═══════════════════════════════════════════════════
// QUIZ
// ═══════════════════════════════════════════════════
let quizDeck = [], quizIdx = 0, quizScores = [], quizFlipped = false;
let quizMode = 'kr'; // 'kr' = KR→FR, 'fr' = FR→KR

const QUIZ_SETS = {
  all: () => { let a=[]; Object.values(DATA.vocab).forEach(v=>a.push(...v)); return a; },
  school: () => [...(DATA.vocab["Sac / École"]||[]), ...(DATA.vocab["Classe / Lycée"]||[])],
  food: () => [...(DATA.vocab["Nourriture"]||[]), ...(DATA.vocab["Plats coréens"]||[])],
};

function startQuiz(set, mode) {
  quizMode = mode || 'kr';
  let items = (QUIZ_SETS[set] ? QUIZ_SETS[set]() :
    DATA.vocab[set] ? DATA.vocab[set] :
    Object.values(DATA.vocab).flat()).filter(i => i.kr && i.fr);
  quizDeck = shuffle([...items]).slice(0, Math.min(items.length, 30));
  quizIdx = 0; quizScores = []; quizFlipped = false;
  document.getElementById('quiz-complete').style.display = 'none';
  document.getElementById('quiz-card-area').style.display = 'flex';
  document.getElementById('quiz-card-area').style.flexDirection = 'column';
  document.getElementById('quiz-card-area').style.alignItems = 'center';
  document.getElementById('quiz-overlay').classList.add('active');
  document.getElementById('quiz-mode-label').textContent = quizMode === 'kr' ? 'Mode : KR → FR' : 'Mode : FR → KR';
  renderQuizCard();
}

function renderQuizCard() {
  const card = quizDeck[quizIdx];
  if (quizMode === 'kr') {
    document.getElementById('fc-kr').textContent = card.kr;
    document.getElementById('fc-fr').textContent = card.fr;
    document.getElementById('fc-rom').textContent = card.rom || '';
  } else {
    document.getElementById('fc-kr').textContent = card.fr;
    document.getElementById('fc-kr').style.fontFamily = "'DM Sans', sans-serif";
    document.getElementById('fc-kr').style.fontSize = '32px';
    document.getElementById('fc-fr').textContent = card.kr;
    document.getElementById('fc-fr').style.fontFamily = "'Noto Sans KR', sans-serif";
    document.getElementById('fc-rom').textContent = card.rom || '';
  }
  document.getElementById('flashcard').classList.remove('flipped');
  quizFlipped = false;
  const pct = (quizIdx / quizDeck.length * 100).toFixed(0);
  document.getElementById('qpfill').style.width = pct + '%';
  document.getElementById('qcounter').textContent = `${quizIdx+1} / ${quizDeck.length}`;
}

function flipCard() {
  document.getElementById('flashcard').classList.toggle('flipped');
  quizFlipped = true;
}

function nextCard(score) {
  quizScores.push(score);
  quizIdx++;
  if (quizIdx >= quizDeck.length) {
    showQuizComplete(); return;
  }
  renderQuizCard();
}

function showQuizComplete() {
  const good = quizScores.filter(s=>s===2).length;
  const ok = quizScores.filter(s=>s===1).length;
  const bad = quizScores.filter(s=>s===0).length;
  document.getElementById('quiz-card-area').style.display = 'none';
  document.getElementById('quiz-complete').style.display = 'block';
  document.getElementById('qpfill').style.width = '100%';
  document.getElementById('quiz-result-text').innerHTML =
    `<strong style="color:var(--green)">${good} connus</strong> · <strong style="color:var(--gold)">${ok} à revoir</strong> · <strong style="color:var(--red2)">${bad} difficiles</strong><br><br>sur ${quizDeck.length} cartes`;
}

function restartQuiz() { quizIdx = 0; quizScores = []; quizDeck = shuffle(quizDeck); document.getElementById('quiz-complete').style.display='none'; document.getElementById('quiz-card-area').style.display='flex'; renderQuizCard(); }
function closeQuiz() { document.getElementById('quiz-overlay').classList.remove('active'); }
function shuffle(arr) { for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
renderHangeul();
document.getElementById('cat-buttons').innerHTML = Object.keys(DATA.vocab).map(c =>
  `<button class="cat-btn" onclick="setCat('${c}')">${CAT_ICONS[c]||''} ${c}</button>`
).join('');

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (!document.getElementById('quiz-overlay').classList.contains('active')) return;
  if (e.code === 'Space') { e.preventDefault(); flipCard(); }
  if (e.code === 'ArrowLeft') nextCard(0);
  if (e.code === 'ArrowDown') nextCard(1);
  if (e.code === 'ArrowRight') nextCard(2);
  if (e.code === 'Escape') closeQuiz();
});