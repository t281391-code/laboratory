import type {
  Equipment,
  Notification,
  Sample,
  Standard,
  TestRecord,
} from "@/lib/types";
import {
  dayOffset,
  daysBetween,
  gradeTarget,
  resultState,
  TODAY,
} from "@/lib/utils";

const projects = [
  "Шинэ Яармаг цогцолбор",
  "Сэлбэ орон сууц",
  "Хан-Уул бизнес төв",
  "Туул голын гүүр",
];
const people = ["Б. Энхжин", "Д. Тэмүүлэн", "С. Номин", "Г. Бат-Эрдэнэ"];
const sampleRows: [string, string, string, number, number, Sample["status"]][] =
  [
    ["U-C-3588–3593", "Бетон", "M400", -28, 28, "Туршилтад бэлэн"],
    ["U-C-3630–3644", "Бетон", "M600", -7, 7, "Туршилтад бэлэн"],
    ["CP8-497–498", "Цемент", "PC 52.5", -3, 3, "Туршилтад бэлэн"],
    ["CP7-991–996", "Бетон", "M400", -30, 28, "Хугацаа хэтэрсэн"],
    ["UA-2938–2941", "Элс", "0–5 мм", 0, 3, "Бүртгэсэн"],
    ["U-C-3645–3650", "Бетон", "M400", -2, 7, "Бэхжүүлж байгаа"],
    ["U-C-3651–3656", "Бетон", "M600", 0, 28, "Бүртгэсэн"],
    ["UA-2942–2945", "Дайрга", "10–20 мм", 0, 3, "Бүртгэсэн"],
    ["U-C-3510–3515", "Бетон", "M400", -28, 28, "Хянаж байгаа"],
    ["U-C-3520–3525", "Бетон", "M600", -29, 28, "Баталгаажсан"],
    ["CP8-499–504", "Цемент", "PC 52.5", -7, 7, "Туршилтад бэлэн"],
    ["U-C-3657–3662", "Бетон", "M400", -3, 3, "Туршилтад бэлэн"],
    ["U-C-3663–3668", "Бетон", "M600", 0, 3, "Бүртгэсэн"],
    ["UA-2946–2949", "Элс", "0–5 мм", -1, 3, "Туршсан"],
    ["U-C-3498–3503", "Бетон", "M400", -29, 28, "Хугацаа хэтэрсэн"],
    ["U-C-3600–3605", "Бетон", "M600", -28, 28, "Туршилтад бэлэн"],
    ["UA-2950–2953", "Дайрга", "10–20 мм", 0, 3, "Бүртгэсэн"],
    ["U-C-3669–3674", "Бетон", "M400", 0, 28, "Бүртгэсэн"],
    ["CP8-505–510", "Цемент", "PC 52.5", -2, 7, "Бэхжүүлж байгаа"],
    ["U-C-3675–3680", "Бетон", "M600", -6, 7, "Бэхжүүлж байгаа"],
  ];
// Historical batches give the chart real, varied daily counts. Their casting
// dates and 3/7/28-day measurements share the same source of truth.
const historicalOffsets = [0, 0, 1, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6];
historicalOffsets.forEach((offset, i) => {
  const first = 3300 + i * 9;
  sampleRows.push([
    `U-C-${first}–${first + 8}`,
    "Бетон",
    i % 3 === 0 ? "M600" : "M400",
    -28 - offset,
    28,
    i < 3 ? "Хянаж байгаа" : "Баталгаажсан",
  ]);
});
export const seedSamples: Sample[] = sampleRows.map((s, i) => ({
  id: `sample-${i + 1}`,
  code: s[0],
  material: s[1],
  grade: s[2],
  castingDate: dayOffset(TODAY, s[3]),
  registeredDate: dayOffset(TODAY, s[3]),
  age: s[4],
  status: s[5],
  count: i === 1 ? 15 : i === 2 ? 2 : i >= 20 ? 9 : 6,
  project: projects[i % projects.length],
  element: [
    "Суурийн хавтан",
    "3-р давхрын багана",
    "Дам нуруу",
    "Гүүрийн тулгуур",
  ][i % 4],
  technician: people[i % 4],
  photos: [],
}));
export const seedTests: TestRecord[] = seedSamples
  .flatMap((sample, i) => {
    if (sample.material !== "Бетон") return [];
    const completed = ["Баталгаажсан", "Хянаж байгаа"].includes(sample.status);
    const elapsed = daysBetween(sample.castingDate, TODAY);
    const ages = [3, 7, 28].filter(
      (age) => age <= elapsed && (completed || age < sample.age),
    );
    return ages.map((age): TestRecord => {
      const base = sample.grade === "M600" ? 61.2 : 42.8;
      const ratio =
        age === 3
          ? 0.53
          : age === 7
            ? 0.76
            : i % 6 === 4
              ? 0.76
              : i % 6 === 3
                ? 0.87
                : 1;
      const result = +(base * ratio).toFixed(2);
      const date = dayOffset(sample.castingDate, age);
      return {
        id: `test-${sample.id}-${age}`,
        kind: "compression",
        sampleCode: sample.code,
        date,
        result,
        state:
          age < 28 ? "warning" : resultState(result, gradeTarget(sample.grade)),
        approved: sample.status !== "Хянаж байгаа" || age < 28,
        technician: sample.technician,
        photos: [],
        values: {
          sampleCode: sample.code,
          grade: sample.grade,
          castingDate: sample.castingDate,
          testDate: date,
          age: String(age),
          width: "150",
          length: "150",
          mass: "8.15",
          load: String(result * 22.5),
          load2: String((result + 0.4) * 22.5),
          load3: String((result - 0.4) * 22.5),
          technician: sample.technician,
          failure: "Хэвийн конус хэлбэрийн",
          notes: "Сорьцын гадаргуу тэгш, ил харагдах гэмтэлгүй.",
        },
      };
    });
  })
  .sort((a, b) => b.date.localeCompare(a.date));

export const compressionSteps = [
  {
    title: "Сорьцын кодыг шалгана",
    description:
      "Сорьц дээрх тэмдэглэгээг бүртгэлийн кодтой тулгана. Цутгасан огноо, турших нас болон бетоны маркийг шалгана.",
  },
  {
    title: "Сорьцын хэмжээг хэмжинэ",
    description:
      "Өргөн, уртыг хоёр байрлалд хэмжиж дундаж утгыг миллиметрээр бүртгэнэ. Жинг килограммаар хэмжинэ.",
  },
  {
    title: "Прессийн гадаргууг цэвэрлэнэ",
    description:
      "Төхөөрөмж ачаалалгүй үед дээд, доод тулгуур хавтангийн үлдэгдлийг зөөлөн сойзоор цэвэрлэнэ.",
  },
  {
    title: "Сорьцыг төвд байрлуулна",
    description:
      "Сорьцыг доод хавтангийн төвийн тэмдэглэгээнд тэгш байрлуулна. Ачаалал өгөх гадаргууг шалгана.",
  },
  {
    title: "Хамгаалалтын хаалгыг хаана",
    description:
      "Хамгаалалтын хаалт бүрэн хаагдсан эсэхийг шалгана. Нүдний шил, хамгаалалтын гутлаа өмсөнө.",
  },
  {
    title: "Ачааллыг жигд нэмэгдүүлнэ",
    description:
      "Лабораторийн батлагдсан аргачлал, үйлдвэрлэгчийн зааврын дагуу ачааллын хурдыг тохируулна. Туршилтын үед хаалтыг нээхгүй.",
  },
  {
    title: "Эвдрэлийн хүчийг бүртгэнэ",
    description:
      "Дэлгэц дээрх хамгийн их ачааллыг кН нэгжээр тэмдэглэнэ. Эвдрэлийн хэлбэрийг бүртгэлд оруулна.",
  },
  {
    title: "Туршилтын зургийг хавсаргана",
    description:
      "Пресс бүрэн зогсож, ачаалал буусны дараа сорьцын эвдрэлийн зургийг авна.",
  },
  {
    title: "Үр дүнг шалгаж хадгална",
    description:
      "Хэмжилтийн нэгж, тооцоолсон бат бэх болон сорьцын кодыг дахин шалгаж Матл-17 маягтыг бөглөнө.",
  },
];
const equipmentRows: [
  string,
  string,
  Equipment["kind"],
  string,
  string,
  Equipment["form"],
][] = [
  [
    "Бетоны шахалтын пресс",
    "CONTROLS PILOT PRO",
    "press",
    "Бетон сорьцын шахалтын бат бэхийг тодорхойлно.",
    "150 × 150 × 150 мм шоо сорьц",
    "compression",
  ],
  [
    "Цементийн шахалтын пресс",
    "AUTOMAX PRO 250",
    "press",
    "Цементэн зуурмагийн шахалтын бат бэхийг тодорхойлно.",
    "40 × 40 × 160 мм призм",
    "cement",
  ],
  [
    "Гулзайлтын бат бэхийн төхөөрөмж",
    "CONTROLS 65-L",
    "press",
    "Призм сорьцын гулзайлтын бат бэхийг хэмжинэ.",
    "Цементэн призм сорьц",
    "cement",
  ],
  [
    "Стандарт шигшүүр",
    "ENDECOTTS 200",
    "sieve",
    "Дүүргэгчийн ширхэглэлийн бүрэлдэхүүнийг тодорхойлно.",
    "Хуурай элс, дайрга",
    "sand",
  ],
  [
    "Хатаах шүүгээ",
    "MEMMERT UN110",
    "oven",
    "Сорьцыг тогтмол жинд хүртэл хатаана.",
    "Элс, хайрга, дайрга",
    "sand",
  ],
  [
    "Лабораторийн жин",
    "OHAUS RANGER 3000",
    "scale",
    "Материал болон сорьцын массыг хэмжинэ.",
    "30 кг хүртэл материал",
    "aggregate",
  ],
  [
    "Агаар хэмжигч",
    "TESTING 8 л",
    "meter",
    "Шинэ бетон хольцын агаарын агууламжийг хэмжинэ.",
    "Шинэ бетон хольц",
    "fresh",
  ],
  [
    "Суултын конус",
    "ABRAMS 300",
    "cone",
    "Бетон хольцын хөдөлгөөнт чанарыг тодорхойлно.",
    "Шинэ бетон хольц",
    "fresh",
  ],
  [
    "Тархалтын төхөөрөмж",
    "CONTROLS 54-C",
    "sieve",
    "Бетон хольцын тархалтыг хэмжинэ.",
    "Шинэ бетон хольц",
    "fresh",
  ],
  [
    "Температур, чийг хэмжигч",
    "TESTO 608-H2",
    "meter",
    "Лабораторийн орчны температур, чийгийг хянана.",
    "Лабораторийн агаар",
    "environment",
  ],
];
export const seedEquipment: Equipment[] = equipmentRows.map((r, i) => ({
  id: `eq-${i + 1}`,
  name: r[0],
  model: r[1],
  kind: r[2],
  purpose: r[3],
  specimens: r[4],
  form: r[5],
  serial: `LAB-${String(2024001 + i)}`,
  status:
    i === 2 ? "Засварт" : i === 0 || i === 5 ? "Үзлэг шаардлагатай" : "Бэлэн",
  lastInspection: dayOffset(TODAY, -60 - i * 2),
  nextInspection: dayOffset(TODAY, i === 0 ? 18 : i === 5 ? 8 : 40 + i * 7),
  calibrationDate: dayOffset(TODAY, i === 0 ? 18 : i === 5 ? 8 : 90 + i * 10),
  technician: people[i % 4],
  tools:
    i < 3
      ? "Штангенциркуль, лабораторийн жин, сойз, хамгаалалтын шил"
      : "Хамгаалалтын бээлий, сорьцын сав, сойз, бүртгэлийн маягт",
  steps:
    i < 3
      ? compressionSteps
      : [
          {
            title: "Бэлтгэл ажлыг гүйцэтгэнэ",
            description: `${r[0]}ийн бүрэн бүтэн байдал, цэвэрлэгээ, тохируулгыг шалгана. Калибровк хүчинтэй эсэхийг нягтална.`,
          },
          {
            title: "Сорьц, хэрэгслийг бэлтгэнэ",
            description: `${r[4]} бэлтгэж кодыг бүртгэлтэй тулгана. Хэмжилтийн сав, багажийг цэвэрлэнэ.`,
          },
          {
            title: "Хэмжилтийг гүйцэтгэнэ",
            description: `${r[3]} Үйлдвэрлэгчийн заавар болон лабораторийн батлагдсан аргачлалыг баримтална.`,
          },
          {
            title: "Үр дүнг бүртгэнэ",
            description:
              "Хэмжилтийг давтан хийж, нэгж болон уншилтыг шалгана. Холбогдох цахим маягтад утгыг оруулна.",
          },
          {
            title: "Цэвэрлэж, ажлыг дуусгана",
            description:
              "Төхөөрөмжийг аюулгүй зогсоож, сорьцын үлдэгдлийг цэвэрлэнэ. Багажийг зориулалтын байранд хадгална.",
          },
        ],
}));
export const seedStandards: Standard[] = [
  {
    id: "std-1",
    number: "MNS 3091:2008",
    title: "Цемент. Техникийн ерөнхий шаардлага",
    material: "Цемент",
    equipment: "Цементийн шахалтын пресс",
    equipmentId: "eq-2",
    form: "cement",
    size: "40 × 40 × 160 мм призм, 6 ширхэг",
    condition: "Температур, бэхжүүлэлтийг батлагдсан аргачлалаар тохируулна.",
    formula: "R = F / A; дундаж = ΣR / n",
    steps: [
      "Цементийн дээжийг төлөөлөхүйц хэмжээгээр авна.",
      "Зуурмаг бэлтгэж хэвлэнэ.",
      "Тогтоосон хугацаанд бэхжүүлнэ.",
      "Гулзайлт, шахалтын туршилт гүйцэтгэнэ.",
    ],
  },
  {
    id: "std-2",
    number: "MNS 2916:2014",
    title: "Барилгын ажилд хэрэглэх элс",
    material: "Элс",
    equipment: "Стандарт шигшүүр",
    equipmentId: "eq-4",
    form: "sand",
    size: "Элс 0–5 мм, 2 кг дээж",
    condition: "Хуурай, төлөөлөхүйц дээж ашиглана.",
    formula: "W = (m₁ − m₂) / m₂ × 100%",
    steps: [
      "Дээжийг сайтар хольж хуваана.",
      "Чийг болон асгаасан нягтыг хэмжинэ.",
      "Шигшүүрээр ангилна.",
      "Ширхэгийн модулийг тооцно.",
    ],
  },
  {
    id: "std-3",
    number: "АРГАЧЛАЛ Б-01",
    title: "Бетоны шахалтын бат бэх тодорхойлох арга",
    material: "Бетон",
    equipment: "Бетоны шахалтын пресс",
    equipmentId: "eq-1",
    form: "compression",
    size: "150 × 150 × 150 мм шоо, 3 ширхэг",
    condition: "Туршилтын хоног: 3, 7, 28 хоног.",
    formula: "R (МПа) = F (кН) × 1000 / A (мм²)",
    steps: compressionSteps.map((s) => s.title),
  },
  {
    id: "std-4",
    number: "АРГАЧЛАЛ Э-02",
    title: "Элсний чийг тодорхойлох арга",
    material: "Элс",
    equipment: "Хатаах шүүгээ",
    equipmentId: "eq-5",
    form: "sand",
    size: "500 г төлөөлөхүйц дээж",
    condition: "Тогтмол жинд хүргэж хатаана.",
    formula: "W = (mнойтон − mхуурай) / mхуурай × 100%",
    steps: [
      "Нойтон дээжийг жинлэнэ.",
      "Батлагдсан температурт хатаана.",
      "Хөргөж дахин жинлэнэ.",
      "Чийгийн хувийг тооцно.",
    ],
  },
  {
    id: "std-5",
    number: "АРГАЧЛАЛ Д-03",
    title: "Хайрга, дайрганы ширхэглэлийн бүрэлдэхүүн",
    material: "Дайрга",
    equipment: "Стандарт шигшүүр",
    equipmentId: "eq-4",
    form: "aggregate",
    size: "10–20 мм дайрга, 5 кг дээж",
    condition: "Шигшүүрийн нүх бөглөрөөгүй, дээж хуурай байна.",
    formula: "aᵢ = mᵢ / m × 100%",
    steps: [
      "Дээжийг хатааж жинлэнэ.",
      "Шигшүүрийг дарааллаар угсарна.",
      "Үлдэгдэл бүрийг жинлэнэ.",
      "Хувийн болон нийт үлдэгдлийг тооцно.",
    ],
  },
];
export const seedNotifications: Notification[] = [
  {
    id: "n1",
    title: "2 сорьцын хугацаа хэтэрсэн",
    description: "Туршилтын хуваарийг шалгаж, ажлыг эрэмбэлнэ үү.",
    href: "/samples/?status=Хугацаа хэтэрсэн",
    read: false,
  },
  {
    id: "n2",
    title: "Калибровкийн хугацаа ойртож байна",
    description: "Бетоны шахалтын пресс · 18 хоног үлдсэн",
    href: "/equipment/?id=eq-1",
    read: false,
  },
  {
    id: "n3",
    title: "Үр дүн хянахад бэлэн",
    description: "4 шинжилгээ баталгаажуулалт хүлээж байна.",
    href: "/tests/?filter=review",
    read: false,
  },
];
