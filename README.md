# Logistika CRM — jadvallar (test topshiriq)

Uchta sahifa — **Reyslar**, **Kontragentlar**, **Litsenziyalar**. Jadval Excel'ga o'rgangan dispetcherga tanish bo'lishi
kerak edi. Fayl tuzilishi o'zgarganda ham ma'lumot ekrandan yo'qolmasligi kerak edi.

## Ishga tushirish

Node.js 18+ kerak (Node 24 da sinab ko'rilgan).

```bash
npm install
npm run dev        # http://localhost:5173
```

| Buyruq | Nima qiladi |
|---|---|
| `npm run dev` | Dev-server |
| `npm test` | Unit va smoke testlar (Vitest, 52 ta) |
| `npm run typecheck` | TypeScript tekshiruvi |
| `npm run build` / `npm run preview` | Production build (`dist/`) va uni ko'rish |

Ma'lumot `public/data/*.json` fayllaridan `fetch` bilan o'qiladi. Fayllar o'zgartirilmagan, topshiriqda qanday berilgan
bo'lsa shunday. Faylni tahrirlab, sahifadagi **Yangilash** tugmasini bosish kifoya — qayta build qilish shart emas.

## Texnologiya va nega aynan shu

- **React 18 + TypeScript + Vite.** TypeScript bu yerda shunchaki moda uchun emas. Ilovaning asosiy ishi — "noma'lum"
  JSON'ni tipli modelga aylantirish. Vite esa tez va sozlashni deyarli talab qilmaydi.
- **Tayyor table kutubxonasi ishlatilmagan** (AG Grid, TanStack va h.k.). Sabablari:
  1. Topshiriqning o'zi jadval bo'yicha qaror qabul qilishni tekshiradi. Asosiy qiyinchilik — to'liq bo'lmagan, noto'g'ri formatdagi va o'zgaruvchan
     ma'lumot, kutubxona esa uni hal qilmaydi.
  2. Kerakli funksiyalar aniq va cheklangan. Grid ~400 qator kod, butun bundle gzip'da ~75 KB (AG Grid'ning o'zi bundan
     bir necha barobar katta).
  3. Ma'lumot normalizatsiyasi UI'dan to'liq ajratilgan (`shared/lib/dataset`). Kelajakda 10 000+ qator yoki server-side
     rejim kerak bo'lsa, faqat ko'rsatish qatlamini TanStack Virtual/AG Grid'ga almashtirish mumkin, mantiq qayta yozilmaydi.
- **react-router-dom** — sahifalar va holatni URL'da saqlash uchun. `HashRouter` tanlangan, shuning uchun build istalgan
  statik hostingda server sozlamasisiz ochiladi.
- **UI kit yoki CSS framework yo'q** — CSS o'zgaruvchilari, yorug' va qorong'i mavzu.
- **Vitest** — sof funksiyalar va real fayllar ustidagi smoke testlar uchun.

## Arxitektura — Feature-Sliced Design

```
src/
├─ app/                 # kirish nuqtasi, router, ErrorBoundary, global stillar
├─ pages/               # trips, counterparties, licenses, not-found — "entity konfiguratsiyasi + widget"
├─ widgets/
│  ├─ data-table/       # ekran: toolbar + grid + drawer + ogohlantirishlar; URL holati (model/useQueryState)
│  └─ app-layout/       # sidebar (yozuvlar soni, muammo indikatori), mavzu
├─ features/
│  ├─ grid-search/      # global qidiruv
│  ├─ column-filter/    # Excel uslubidagi ustun filtri + faol filtr "chip"lari
│  ├─ column-settings/  # ustunlarni ko'rsatish/yashirish/tartiblash/kenglik (localStorage)
│  ├─ export-csv/       # ko'rinib turgan qatorlarni Excel'ga eksport
│  └─ theme-toggle/
├─ entities/
│  ├─ trip/             # model/columns.tsx — reys ustunlari: yo'llar, turlar, yorliqlar, validatsiya
│  ├─ counterparty/
│  └─ license/
└─ shared/
   ├─ lib/dataset/      # ⭐ yadro: extract → flatten → infer → parse → Cell → filter/sort (React'ga bog'liq emas)
   ├─ lib/storage/      # xavfsiz localStorage/sessionStorage
   ├─ api/              # JSON yuklash + kesh + xato holatlari
   ├─ ui/               # Badge, Popover, Icon, katak rendererlari
   └─ config/           # davlatlar ma'lumotnomasi
```

Importlar faqat pastki qatlamlarga va faqat slice'ning public API'si (`index.ts`) orqali qilinadi. Bu `grep` bilan
tekshirilgan, qoidabuzarlik yo'q.

**Asosiy g'oya.** Har bir sahifa — bu faqat konfiguratsiya (`entities/*/model/columns.tsx`): qaysi maydon, qanday
nomda, qaysi turda ko'rsatiladi. Saralash, filtr, qidiruv, ustunlar bilan ishlash, eksport va drawer'ning hammasi bitta
`DataTable` widget'ida. Shuning uchun uchala sahifada jadval **bir xil ko'rinadi va bir xil ishlaydi** (3-talab). Yangi
reestr qo'shish — bitta konfiguratsiya fayli.

## Foydalanuvchi uchun nima bor

**Excel'ga o'xshash narsalar**
- Sarlavhani bosish — saralash (↑ → ↓ → o'chiq). **Shift+bosish** bilan bir necha ustun bo'yicha saralanadi, tartib
  raqami ham ko'rsatiladi. Bo'sh qiymatlar har doim oxirida turadi.
- Har bir sarlavhada **avtofiltr tugmasi** bor. Ichida: tepada saralash, ostida ustun turiga mos filtr:
  - *matn, holat, ro'yxat* — qidiruvli belgilash ro'yxati, har qiymat yonida soni. "(Hammasini tanlash)", "(Bo'sh)" va
    "faqat shu" ham bor. Sonlar boshqa filtrlar hisobga olingan holda chiqadi, xuddi Excel'dagidek;
  - *son* — oraliq ("dan / gacha"), vergul bilan kiritsa ham bo'ladi (`12,5`). Ma'lumotdagi min va max ko'rsatiladi;
  - *sana* — davr va tezkor tanlovlar: bugun, 7 kun, 30 kun, shu oy, kelgusi 30 kun, o'tgan.
- Filtrlangan ustunning sarlavhasi va filtr tugmasi rangda ajralib turadi.
- Ustun kengligi sudrab o'zgartiriladi, **ikki marta bosish — kontentga moslash**. Sarlavhani sudrab ustun ko'chiriladi.
- Qator raqamlari (`#`) va birinchi ustun gorizontal skrollda qotib turadi, sarlavha va "Jami" qatori ham doim ko'rinadi.
- "Jami" qatori: og'irlik va yozuvlar soni yig'indisi. **Narx valyutalar bo'yicha alohida** yig'iladi, chunki UZS va
  USD'ni qo'shib bo'lmaydi.
- **Excel eksport** (CSV, `;` ajratgich, UTF-8 BOM). Excel uni to'g'ridan-to'g'ri ochadi, faqat ekranda ko'rinib turgan
  narsa eksport qilinadi.

**Kundalik ish uchun**
- Global qidiruv barcha ustunlar bo'yicha ishlaydi, jumladan yashirin va yangi ustunlar ham. So'zlar AND bilan
  birlashadi (`bobur adr`). Apostrof variantlari farqlanmaydi (`o'g'it` = `oʻgʻit` = `o‘g‘it`). Telefonni raqamning bir
  qismi bo'yicha topish mumkin. **`/`** — qidiruvga o'tish, **Esc** — tozalash.
- Faol filtrlar "chip"lar ko'rinishida turadi: bosib tahrirlanadi, `×` bilan o'chiriladi, yonida "Hammasini tozalash".
- Qatorni bosish (yoki ↑/↓ + Enter) **yozuv kartasini** ochadi. Unda barcha maydonlar bor: jadvalda yashirilganlari,
  yangi maydonlar, ma'lumot muammolari ro'yxati va asl JSON. ↑/↓ bilan keyingi yozuvga o'tiladi. Matnni belgilab nusxa
  olayotganda karta ochilmaydi.
- **Holat URL'da saqlanadi**: qidiruv, filtrlar, saralash va ochiq yozuv. Havolani hamkasbga yuborsangiz, u xuddi shu
  ko'rinishni ko'radi. Sahifalar orasida o'tganda filtrlar yo'qolmaydi.
- Ustun sozlamalari (tartib, ko'rinish, kenglik) brauzerda saqlanadi, "Standart" tugmasi bilan tiklanadi. Qator zichligi
  ikki xil (oddiy/zich), yorug' va qorong'i mavzu bor.
- Telefon raqamlari bosiladigan (`tel:`). Davlat raqamlari plashka ko'rinishida.
- Litsenziyalar uchun **Holat** va **Qolgan kun** hisoblanadi: *Muddati o'tgan / Tugayapti (≤30 kun) / Amalda /
  Noma'lum*. Ro'yxat standart holatda muddati o'tganlardan boshlab saralanadi — dispetcher uchun eng muhim signal shu.
- Mobil ekranda sidebar tepaga o'tadi, yozuv kartasi ekran ustida ochiladi, tugmalar ixchamlashadi.

## "Fayl tuzilishi o'zgarsa ham ishlaydi" (4-talab) — qanday hal qilindi

Asosiy qoida: **har qanday kutilmagan holatda ma'lumot ko'rsatiladi va muammo belgilanadi**. Hech narsa jimgina
tashlab yuborilmaydi va ilova yiqilmaydi.

| Holat | Nima bo'ladi |
|---|---|
| Massiv boshqa joyga ko'chdi (`items` → `data.results`) | JSON daraxti ichidan eng ko'p obyekt saqlagan massiv avtomatik topiladi, foydalanuvchiga ogohlantirish chiqadi |
| Yangi maydon paydo bo'ldi (`completed_at`, `extra.note`) | Ustun avtomatik qo'shiladi, turi qiymatlarga qarab aniqlanadi (son/sana/ro'yxat/...). Sarlavhada **"yangi"** belgisi bo'ladi, filtr, saralash va qidiruv ham ishlaydi |
| Ma'lum maydon yo'qoldi yoki nomi o'zgardi | Sarlavha ⚠ va chizilgan nom bilan belgilanadi, tepada "ma'lumotda topilmagan ustunlar" xabari chiqadi. Yangi nomdagi maydon esa avtomatik ustun bo'lib keladi |
| Noma'lum enum qiymati (`ARCHIVED_V2`) | Asl qiymati bilan, punktir badge va ⚠ bilan ko'rsatiladi |
| Tur noto'g'ri (`"12,5"`, `"26.10.2026"`) | Iloji bo'lsa o'qiladi va ⚠ "asl qiymat: …" bilan belgilanadi. O'qib bo'lmasa — asl matn ko'rsatiladi |
| `null`, bo'sh massiv, kalitning o'zi yo'q | Ma'noli matn chiqadi: "Biriktirilmagan", "Kelishilmagan", "Hujjat yuklanmagan", "Rol belgilanmagan"… |
| Obyekt kutilgan joyda massiv yoki aksincha | Matnga aylantiriladi (`toText`) va ⚠ bilan belgilanadi |
| Konfiguratsiyadagi renderer xato berdi | Katak oddiy matnga qaytadi. Sahifa darajasida `ErrorBoundary` bor |
| Fayl yo'q yoki JSON buzilgan | Tushunarli xato, xom matn bo'lagi va "Qayta urinish" tugmasi |
| `total` haqiqiy yozuvlar soniga mos emas | Ogohlantirish chiqadi |
| Eski havolada endi mavjud bo'lmagan ustun filtri bor | Filtr e'tiborsiz qoldiriladi, jadval bo'sh bo'lib qolmaydi |

Toolbar'dagi **"⚠ N ta qatorda muammo"** tugmasi faqat shubhali qatorlarni ko'rsatadi. Sidebar'dagi sariq nuqta ham shu
haqda ogohlantiradi.

### Berilgan fayllarda topilgan muammolar

- **trips.json**: `weight_t: "12,5"` (matn va vergul); `created_at: "26.10.2026"` (ISO emas); 6 ta reysda `to_country`
  yo'q; 4 ta reysda `vehicle` umuman yo'q; `driver: null`; narx va valyuta `null`; noma'lum status `ARCHIVED_V2`;
  kutilmagan `completed_at`; valyutalar aralash (UZS/USD).
- **counterparties.json**: root — oddiy massiv; `roles: []`; ikkita yozuvda `since` yo'q, uchtasida sana kelajakda;
  `phone: null`; bir xil ism bilan turli shaxslar (PINFL farq qiladi); `has_duplicates`; kutilmagan `extra: {note, score}`.
- **licenses.json**: ichma-ich `data.licenses`; `files: null` va `[]`; `valid_to: null`; ikkita yozuvda `issuer` yo'q;
  `driver: null`; `owner.address: null`; ko'p litsenziyaning muddati o'tgan.

## Qiyin bo'lgan qarorlar

1. **Noma'lum maydonni ko'rsatish yoki yashirish.** Yashirsa — talab buziladi ("ma'lumot yo'qolmasin"). Indamay
   ko'rsatsa — foydalanuvchi "bu nima?" deb hayron bo'ladi. Natijada ko'rsatdim, lekin "yangi" belgisi va tepada
   tushuntirish bilan. Ustunni bir bosishda yashirish mumkin, yozuv kartasida esa u har doim ko'rinadi.
2. **Noto'g'ri formatdagi qiymatni "tuzatish" yoki borligicha ko'rsatish.** `"12,5"`ni jimgina 12.5 ga aylantirish qulay, lekin bu manbadagi
   xatoni yashiradi. Shu sabab ikkalasini qildim: qiymat son sifatida ishlaydi (filtr, saralash, yig'indi), ammo ⚠ bilan
   belgilanadi.
3. **Aralash valyuta.** Kursni bilmaymiz, UZS va USD'ni qo'shish yoki aralashtirib saralash — xato natija beradi.
   Shuning uchun narx avval valyuta, keyin summa bo'yicha saralanadi, "Jami" esa valyutalar bo'yicha alohida. Alohida
   "Valyuta" ustuni orqali filtrlash mumkin.
4. **Filtr UX.** Excel'ning belgilash ro'yxati high-cardinality ustunlarda (masalan, ID) noqulay. Shuning uchun ro'yxat
   ustida qidiruv bor. Agar qidiruv bilan hamma mos qiymatlar tanlansa, filtr "o'z ichiga oladi" sifatida saqlanadi —
   keyin qo'shilgan mos yozuvlar ham filtrga tushadi. Son va sana uchun ro'yxat o'rniga oraliq ishlatildi, chunki 60 xil
   og'irlikdan tanlash hech kimga kerak emas.
5. **"Qolgan kun" va litsenziya holati — saqlanadigan maydon emas, hisoblanadigan.** Ular bugungi sanaga bog'liq,
   shuning uchun faylda emas, UI'da hisoblanadi.
6. **Litsenziya va reys o'rtasidagi bog'liqlik** (bir xil davlat raqamlari, haydovchilar). Ulash juda qiziq edi, lekin
   ma'lumotda ishonchli kalit yo'q (ism bo'yicha bog'lash xato beradi). Shuning uchun bog'lamadim.

## Vaqt bo'lganda nima qo'shardim

- **Virtualizatsiya** (10 000+ qator) va server-side filtr/saralash/pagination. Yadro (`QueryState`) API so'roviga
  tayyor, uni `?f=...` sifatida yuborish mumkin.
- **Saqlangan ko'rinishlar**: "Mening nizoli reyslarim", "30 kunda tugaydigan litsenziyalar" kabi.
- Reys → haydovchi → litsenziya **bog'lanishlari** (ishonchli ID kelganda).
- Bir nechta qatorni belgilash va guruh amallari, katakni nusxalash (Ctrl+C), ustun bo'yicha guruhlash.
- Ma'lumot sxemasini `zod` bilan tavsiflash va o'zgarishlarni monitoringga (Sentry) yuborish — dasturchi muammoni
  foydalanuvchidan oldin bilsin.
- **E2E testlar (Playwright)** — foydalanuvchi ssenariylarini brauzerda avtomatik tekshirish: ustun filtrini
  qo'llash va olib tashlash, Shift bilan bir necha ustun bo'yicha saralash, ustun kengligini o'zgartirish va ko'chirish,
  URL orqali holatni tiklash, yozuv kartasida ↑/↓ bilan yurish, CSV eksport. Hozirgi testlar mantiq va render
  darajasida; e2e esa haqiqiy sichqoncha va klaviatura bilan ishlashni kafolatlaydi.
- i18n (rus tili), haqiqiy `.xlsx` eksport.
- Kontragentlardagi dublikatlarni birlashtirish oqimi.

## Testlar

- `src/shared/lib/dataset/core.test.ts` — parse, flatten, massivni topish, tur aniqlash, filtr, saralash, root kaliti
  o'zgarishi.
- `src/widgets/data-table/ui/smoke.test.tsx` — uchala **real fayl** ustida dataset quriladi va grid render qilinadi:
  `"12,5"`, `"26.10.2026"`, `ARCHIVED_V2`, `extra.*`, `files: null` va boshqa holatlar.
