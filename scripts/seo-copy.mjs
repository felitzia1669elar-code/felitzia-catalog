// Metadata for existing services only. Visible service names and prices stay in pageContent.
const localized = (ru, ro, en) => Object.fromEntries(
  ["ru", "ro", "en"].map((lang, i) => [lang, { title: [ru, ro, en][i][0], description: [ru, ro, en][i][1] }]),
);

export const homeSeo = localized(
  ["Нумеролог и астролог онлайн — Фелиция", "Консультации Фелиции онлайн: нумерологический разбор по дате рождения, астрология, совместимость, Таро и руны. Состав услуг, цены и запись."],
  ["Numerolog și astrolog online — Felitzia", "Consultații online cu Felitzia: numerologie după data nașterii, astrologie, compatibilitate, Tarot și rune. Servicii, prețuri și programări."],
  ["Online Numerology & Astrology Consultations — Felitzia", "Online consultations with Felitzia: birth date numerology, astrology, relationship compatibility, Tarot and runes. Explore services, prices and booking."],
);

export const detailSeo = {
  "programma-sudby": localized(
    ["Нумерологический разбор по дате рождения — Фелиция", "Закажите разбор по дате рождения у Фелиции: программа и матрица судьбы, личные качества, предназначение и жизненные циклы. Состав консультации и запись."],
    ["Analiză numerologică după data nașterii — Felitzia", "Consultație de numerologie cu Felitzia: programul și matricea destinului, calități personale, vocație și cicluri de viață. Detalii și programare online."],
    ["Birth Date Numerology Reading — Felitzia", "Book a numerology reading with Felitzia. Explore your birth date, destiny matrix, personal qualities, purpose and life cycles. Consultation details and booking."],
  ),
  astrologiya: localized(
    ["Консультация астролога онлайн — Фелиция", "Астрологическая консультация Фелиции: формула души, динамический гороскоп, солярные карты и астрокартография. Состав разбора, стоимость и запись онлайн."],
    ["Consultație de astrologie online — Felitzia", "Astrologie cu Felitzia: formula sufletului, horoscop dinamic, revoluție solară și astrocartografie. Află ce include consultația, prețul și cum te programezi."],
    ["Online Astrology Consultation — Felitzia", "Explore astrology with Felitzia: soul formula, dynamic horoscope, solar return charts and astrocartography. Consultation details, prices and online booking."],
  ),
  sovmestimost: localized(
    ["Совместимость по дате рождения — разбор Фелиции", "Разбор совместимости по датам рождения: любовный союз, семья, отношения с детьми и деловое партнёрство. Узнайте состав консультации Фелиции и стоимость."],
    ["Compatibilitate după data nașterii — Felitzia", "Analiza compatibilității după datele de naștere: cuplu, familie, relații cu copiii și parteneriate de afaceri. Consultații cu Felitzia, detalii și prețuri."],
    ["Birth Date Compatibility Reading — Felitzia", "Explore birth date compatibility for couples, families, parent-child relationships and business partners. View Felitzia's consultation details and prices."],
  ),
  "taro-rasklad": localized(
    ["Заказать расклад Таро онлайн — Фелиция", "Индивидуальный расклад Таро у Фелиции на конкретный вопрос или ближайший период: разбор карт, ситуации и возможных действий. Стоимость и запись онлайн."],
    ["Etalare Tarot online — consultație cu Felitzia", "Etalare Tarot individuală pentru o întrebare sau perioada următoare: interpretarea cărților, situației și opțiunilor. Prețuri și programări la Felitzia."],
    ["Book an Online Tarot Reading — Felitzia", "Book a personal Tarot reading with Felitzia for a specific question or the coming period. Explore the cards, your situation and options. Details and prices."],
  ),
  paket: localized(
    ["Пакет консультаций: нумерология и астрология — Фелиция", "Пакет Фелиции за €200: программа судьбы, лабиринт кармы, астрология и совместимость. Консультация 1,5–2 часа, материалы и поддержка 30 дней."],
    ["Pachet de numerologie și astrologie — Felitzia", "Pachet Felitzia de €200: programul destinului, labirintul karmei, astrologie și compatibilitate. Consultație de 1,5–2 ore, materiale și suport 30 de zile."],
    ["Numerology & Astrology Consultation Package — Felitzia", "Felitzia's €200 package: destiny program, karma labyrinth, astrology and compatibility. A 1.5–2 hour consultation, materials and 30 days of support."],
  ),
  "labirint-karmy": localized(
    ["Лабиринт кармы — нумерологическая консультация Фелиции", "Индивидуальный разбор «Лабиринт кармы»: кармические уроки, прошлый опыт, ключевые годы и персональные графики. Состав консультации Фелиции и запись."],
    ["Labirintul karmei — consultație cu Felitzia", "Analiză individuală a temelor karmice, experiențelor trecute, anilor-cheie și graficelor personale. Descoperă consultația Labirintul karmei cu Felitzia."],
    ["Karma Labyrinth — Personal Reading with Felitzia", "Explore karmic themes, past experiences, key years and personal charts in Felitzia's Karma Labyrinth reading. Consultation details, prices and booking."],
  ),
  rodologiya: localized(
    ["Родология — разбор родовых программ с Фелицией", "Консультация по родологии: родовые программы, семейные сценарии, таланты рода, родовая мандала и графики. Состав разбора Фелиции, стоимость и запись."],
    ["Rodologie — analiza tiparelor familiale cu Felitzia", "Consultație de rodologie: tipare familiale, programe ancestrale, talente, mandala neamului și grafice. Detalii, prețuri și programări la Felitzia."],
    ["Ancestral & Family Pattern Reading — Felitzia", "Explore family patterns, ancestral themes, inherited talents, lineage mandalas and charts with Felitzia. Consultation details, prices and booking."],
  ),
  "professiya-kariera": localized(
    ["Нумерология профессии и карьеры — Фелиция", "Нумерологический разбор профессии и карьеры: призвание, матрица профессий, самореализация и личные графики. Состав консультации Фелиции и стоимость."],
    ["Numerologie pentru profesie și carieră — Felitzia", "Analiză numerologică a carierei: vocație, matricea profesiilor, realizare personală și grafice individuale. Consultații cu Felitzia, detalii și prețuri."],
    ["Career & Vocation Numerology Reading — Felitzia", "Explore career and vocation through numerology with Felitzia: profession matrix, personal fulfilment and individual charts. Consultation details and prices."],
  ),
  "biznes-finansy": localized(
    ["Нумерология бизнеса — консультация Фелиции", "Эзотерический разбор бизнеса с Фелицией: направления реализации, ниша возможностей и циклы развития компании. Состав консультации, стоимость и запись."],
    ["Numerologie pentru afaceri — Felitzia", "Analiză ezoterică a afacerii cu Felitzia: direcții de dezvoltare, oportunități și ciclurile companiei. Află ce include consultația, prețul și programarea."],
    ["Business Numerology Consultation — Felitzia", "Explore business themes through an esoteric reading with Felitzia: opportunities, directions and company cycles. Consultation details, prices and booking."],
  ),
  amuletostroenie: localized(
    ["Амулеты, талисманы и руновязи — Фелиция", "Индивидуальная работа с рунами и символами: руновязи, руноставы, амулеты и талисманы под намерение. Состав услуги Фелиции, стоимость и запись."],
    ["Amulete, talismane și combinații de rune — Felitzia", "Lucru individual cu rune și simboluri: combinații de rune, amulete și talismane pentru o intenție personală. Servicii, prețuri și programări la Felitzia."],
    ["Amulets, Talismans & Bindrunes — Felitzia", "Personal rune and symbol work with Felitzia: bindrunes, amulets and talismans for your intention. Explore the service, prices and consultation booking."],
  ),
  "manticheskaya-praktika": localized(
    ["Руны и мантические практики — консультация Фелиции", "Выберите мантическую практику у Фелиции: руны, символические квадраты, янтры, сигилы и обрядовые куклы. Описание направлений, стоимость и запись."],
    ["Rune și practici divinatorii — Felitzia", "Alege o practică divinatorie cu Felitzia: rune, pătrate simbolice, yantre, sigilii și păpuși rituale. Descrierea serviciilor, prețuri și programări."],
    ["Runes & Divination Consultations — Felitzia", "Explore rune work, symbolic squares, yantras, sigils and ritual dolls with Felitzia. Choose a practice and view consultation details, prices and booking."],
  ),
  regressonumerologiya: localized(
    ["Регрессонумерология — консультация Фелиции", "Авторский эзотерический разбор Фелиции: регрессонумерология, темы воплощений, сновидения и символические практики. Состав консультации и запись."],
    ["Numerologie regresivă — consultație cu Felitzia", "Explorare ezoterică cu Felitzia: numerologie regresivă, teme ale încarnărilor, vise și practici simbolice. Detalii despre consultație și programare."],
    ["Regression Numerology Consultation — Felitzia", "Explore Felitzia's esoteric approach to regression numerology, incarnation themes, dreams and symbolic practices. Consultation details and booking."],
  ),
  zdorovye: localized(
    ["Здоровье — эзотерический разбор Фелиции", "Раздел «Здоровье» в каталоге Фелиции: символический разбор личных ритмов, ауры и энергетической структуры. Состав эзотерической консультации и стоимость."],
    ["Sănătate — explorare ezoterică cu Felitzia", "Secțiunea Sănătate din catalogul Felitzia: explorarea simbolică a ritmurilor personale, aurei și structurii energetice. Detalii despre consultație și preț."],
    ["Health — An Esoteric Reading with Felitzia", "Felitzia's Health section explores personal rhythms, aura and energy structure through symbolic practices. View esoteric consultation details and prices."],
  ),
};
