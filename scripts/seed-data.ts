/**
 * Deterministic dataset for Ripple — a fictional chocolate & snack maker
 * ("Ambrosia Foods") and its multi-tier supply chain.
 *
 * Scale targets the CognoDB free tier: ~1,330 nodes / ~2,700 relationships
 * after shipment generation in seed.ts.
 */

export interface RegionRow {
  id: string;
  name: string;
  riskLevel: "low" | "medium" | "high";
  riskScore: number; // 1–10
}

export interface FacilityRow {
  id: string;
  name: string;
  type: string;
  regionId: string;
}

export interface SupplierRow {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  reliability: number; // 0–1, drives on-time shipment generation
  facilities: FacilityRow[];
  sourcesFrom: string[]; // upstream supplier ids
}

export interface SupplierLink {
  supplierId: string;
  leadTimeDays: number;
  isPrimary: boolean;
}

export interface ComponentRow {
  id: string;
  name: string;
  category: string;
  criticality: number; // 1–5
  partOf: string[]; // parent component ids (recipe / sub-assembly membership)
  suppliedBy: SupplierLink[];
}

export interface BomLine {
  componentId: string;
  quantity: number;
}

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  unitsPerYear: number;
  contains: BomLine[];
}

export const regions: RegionRow[] = [
  { id: "r-mg", name: "Madagascar", riskLevel: "high", riskScore: 9 },
  { id: "r-ua", name: "Ukraine", riskLevel: "high", riskScore: 9 },
  { id: "r-ci", name: "Côte d'Ivoire", riskLevel: "high", riskScore: 8 },
  { id: "r-gh", name: "Ghana", riskLevel: "medium", riskScore: 6 },
  { id: "r-tr", name: "Giresun, Türkiye", riskLevel: "medium", riskScore: 6 },
  { id: "r-my", name: "Malaysia", riskLevel: "medium", riskScore: 5 },
  { id: "r-ar", name: "Argentina", riskLevel: "medium", riskScore: 5 },
  { id: "r-ec", name: "Ecuador", riskLevel: "medium", riskScore: 4 },
  { id: "r-br", name: "Brazil", riskLevel: "medium", riskScore: 4 },
  { id: "r-mx", name: "Mexico", riskLevel: "medium", riskScore: 4 },
  { id: "r-cz", name: "Czechia", riskLevel: "low", riskScore: 3 },
  { id: "r-pl", name: "Poland", riskLevel: "low", riskScore: 3 },
  { id: "r-nl", name: "Netherlands", riskLevel: "low", riskScore: 2 },
  { id: "r-de", name: "Germany", riskLevel: "low", riskScore: 2 },
  { id: "r-fr", name: "France", riskLevel: "low", riskScore: 2 },
  { id: "r-nz", name: "New Zealand", riskLevel: "low", riskScore: 2 },
];

export const suppliers: SupplierRow[] = [
  // ── Tier 1: processors, recipe houses & packaging converters ────────
  {
    // The hero risk story: the only cocoa processor in the network. Every
    // chocolate product in the portfolio traces back through this node.
    id: "s-grindwell", name: "Grindwell Cocoa Processing", tier: 1, reliability: 0.93,
    facilities: [
      { id: "f-grindwell-zaandam", name: "Grindwell Grinding Works Zaandam", type: "Cocoa Grinding Plant", regionId: "r-nl" },
      { id: "f-grindwell-rotterdam", name: "Grindwell Press House Rotterdam", type: "Cocoa Press Plant", regionId: "r-nl" },
    ],
    sourcesFrom: ["s-ivoire", "s-ashanti", "s-andes"],
  },
  {
    id: "s-couvertura", name: "Couvertura Chocolate Works", tier: 1, reliability: 0.95,
    facilities: [{ id: "f-couvertura-cologne", name: "Couvertura Conche Plant Cologne", type: "Chocolate Plant", regionId: "r-de" }],
    sourcesFrom: ["s-grindwell", "s-dolcezucar", "s-lactonord", "s-emulso", "s-vanico"],
  },
  {
    id: "s-caramelia", name: "Caramelia Fillings", tier: 1, reliability: 0.91,
    facilities: [{ id: "f-caramelia-lille", name: "Caramelia Cook House Lille", type: "Filling Plant", regionId: "r-fr" }],
    sourcesFrom: ["s-dolcezucar", "s-lactonord", "s-marisal", "s-palmara"],
  },
  {
    id: "s-pralinart", name: "Pralin'Art Nut Pastes", tier: 1, reliability: 0.89,
    facilities: [{ id: "f-pralinart-lyon", name: "Pralin'Art Roastery Lyon", type: "Nut Paste Plant", regionId: "r-fr" }],
    sourcesFrom: ["s-nuttoro", "s-grindwell", "s-dolcezucar", "s-palmara"],
  },
  {
    id: "s-biscotta", name: "Biscotta Bakery Works", tier: 1, reliability: 0.9,
    facilities: [
      { id: "f-biscotta-poznan", name: "Biscotta Bake Line Poznań", type: "Bakery Plant", regionId: "r-pl" },
      { id: "f-biscotta-nuremberg", name: "Biscotta Pretzel House Nürnberg", type: "Bakery Plant", regionId: "r-de" },
    ],
    sourcesFrom: ["s-molinera", "s-helios-oil", "s-dolcezucar", "s-grindwell", "s-marisal"],
  },
  {
    id: "s-granolara", name: "Granolara Cereal Works", tier: 1, reliability: 0.88,
    facilities: [{ id: "f-granolara-hamburg", name: "Granolara Toasting Plant Hamburg", type: "Cereal Plant", regionId: "r-de" }],
    sourcesFrom: ["s-molinera", "s-mielera", "s-helios-oil", "s-grindwell"],
  },
  {
    // Sole vanilla extract house — and the only route to Madagascar vanilla.
    id: "s-vanico", name: "Vanico Extract House", tier: 1, reliability: 0.86,
    facilities: [{ id: "f-vanico-dijon", name: "Vanico Extraction Plant Dijon", type: "Flavour Plant", regionId: "r-fr" }],
    sourcesFrom: ["s-sava-vanilla"],
  },
  {
    id: "s-lactonord", name: "LactoNord Dairy", tier: 1, reliability: 0.96,
    facilities: [
      { id: "f-lactonord-hamilton", name: "LactoNord Drying Plant Hamilton", type: "Milk Powder Plant", regionId: "r-nz" },
      { id: "f-lactonord-taranaki", name: "LactoNord Creamery Taranaki", type: "Creamery", regionId: "r-nz" },
    ],
    sourcesFrom: ["s-kaimai"],
  },
  {
    id: "s-dolcezucar", name: "Dolce Açúcar Refinaria", tier: 1, reliability: 0.92,
    facilities: [{ id: "f-dolcezucar-piracicaba", name: "Dolce Açúcar Refinery Piracicaba", type: "Sugar Refinery", regionId: "r-br" }],
    sourcesFrom: ["s-canaverde"],
  },
  {
    // Qualified second source for cane sugar — EU beet sugar.
    id: "s-beetzucker", name: "NordBeet Zuckerwerk", tier: 1, reliability: 0.94,
    facilities: [{ id: "f-beetzucker-magdeburg", name: "NordBeet Sugar Works Magdeburg", type: "Sugar Refinery", regionId: "r-de" }],
    sourcesFrom: ["s-rheinbeet"],
  },
  {
    id: "s-emulso", name: "Emulso Lecithin Works", tier: 1, reliability: 0.87,
    facilities: [{ id: "f-emulso-hamburg", name: "Emulso Lecithin Plant Hamburg", type: "Emulsifier Plant", regionId: "r-de" }],
    sourcesFrom: ["s-blacksea"],
  },
  {
    id: "s-helios-oil", name: "Helios Oil Refining", tier: 1, reliability: 0.85,
    facilities: [{ id: "f-helios-gdansk", name: "Helios Refinery Gdańsk", type: "Oil Refinery", regionId: "r-pl" }],
    sourcesFrom: ["s-blacksea"],
  },
  {
    id: "s-nuttoro", name: "Nuttoro Nut Processing", tier: 1, reliability: 0.84,
    facilities: [{ id: "f-nuttoro-giresun", name: "Nuttoro Cracking Plant Giresun", type: "Nut Processing Plant", regionId: "r-tr" }],
    sourcesFrom: ["s-giresun"],
  },
  {
    id: "s-palmara", name: "Palmara Sustainable Oils", tier: 1, reliability: 0.9,
    facilities: [{ id: "f-palmara-klang", name: "Palmara Refinery Port Klang", type: "Oil Refinery", regionId: "r-my" }],
    sourcesFrom: ["s-tanahsawit"],
  },
  {
    id: "s-molinera", name: "Molinera Flour & Oat Mills", tier: 1, reliability: 0.93,
    facilities: [{ id: "f-molinera-krakow", name: "Molinera Mill Kraków", type: "Grain Mill", regionId: "r-pl" }],
    sourcesFrom: ["s-vistula"],
  },
  {
    id: "s-foilwrap", name: "FoilWrap Converting", tier: 1, reliability: 0.95,
    facilities: [{ id: "f-foilwrap-aachen", name: "FoilWrap Converting Aachen", type: "Foil Converting Plant", regionId: "r-de" }],
    sourcesFrom: ["s-alumroll"],
  },
  {
    id: "s-cartonex", name: "Cartonex Print & Pack", tier: 1, reliability: 0.94,
    facilities: [{ id: "f-cartonex-lodz", name: "Cartonex Press Łódź", type: "Carton Press", regionId: "r-pl" }],
    sourcesFrom: ["s-nordboard"],
  },
  {
    // Qualified second source for printed cartons.
    id: "s-cajamex", name: "CajaMex Empaques", tier: 1, reliability: 0.89,
    facilities: [{ id: "f-cajamex-queretaro", name: "CajaMex Plant Querétaro", type: "Carton Press", regionId: "r-mx" }],
    sourcesFrom: ["s-nordboard"],
  },
  {
    id: "s-filmtek", name: "FilmTek Flexibles", tier: 1, reliability: 0.91,
    facilities: [{ id: "f-filmtek-johor", name: "FilmTek Extrusion Johor", type: "Film Plant", regionId: "r-my" }],
    sourcesFrom: ["s-resinova"],
  },
  {
    id: "s-vitrum", name: "Vitrum Glassworks", tier: 1, reliability: 0.92,
    facilities: [{ id: "f-vitrum-teplice", name: "Vitrum Furnace Teplice", type: "Glass Furnace", regionId: "r-cz" }],
    sourcesFrom: ["s-silicane"],
  },
  {
    id: "s-frigopack", name: "FrigoPack Containers", tier: 1, reliability: 0.9,
    facilities: [{ id: "f-frigopack-wroclaw", name: "FrigoPack Line Wrocław", type: "Container Plant", regionId: "r-pl" }],
    sourcesFrom: ["s-nordboard", "s-resinova"],
  },
  {
    id: "s-tinsmith", name: "Tinsmith Metal Packaging", tier: 1, reliability: 0.88,
    facilities: [{ id: "f-tinsmith-brno", name: "Tinsmith Tin Line Brno", type: "Metal Packaging Plant", regionId: "r-cz" }],
    sourcesFrom: ["s-alumroll"],
  },

  // ── Tier 2: origin co-operatives, farms & material mills ────────────
  {
    id: "s-ivoire", name: "Coopérative Cacao Ivoire", tier: 2, reliability: 0.79,
    facilities: [
      { id: "f-ivoire-sanpedro", name: "Ivoire Drying Station San-Pédro", type: "Fermentary", regionId: "r-ci" },
      { id: "f-ivoire-yamoussoukro", name: "Ivoire Collection Centre Yamoussoukro", type: "Collection Centre", regionId: "r-ci" },
    ],
    sourcesFrom: [],
  },
  {
    id: "s-ashanti", name: "Ashanti Cocoa Co-operative", tier: 2, reliability: 0.83,
    facilities: [{ id: "f-ashanti-kumasi", name: "Ashanti Fermentary Kumasi", type: "Fermentary", regionId: "r-gh" }],
    sourcesFrom: [],
  },
  {
    id: "s-andes", name: "Andes Cacao Nacional", tier: 2, reliability: 0.86,
    facilities: [{ id: "f-andes-guayaquil", name: "Andes Fermentary Guayaquil", type: "Fermentary", regionId: "r-ec" }],
    sourcesFrom: [],
  },
  {
    // Cyclone-exposed sole vanilla origin (the 2017 vanilla crisis echo).
    id: "s-sava-vanilla", name: "SAVA Vanilla Growers", tier: 2, reliability: 0.74,
    facilities: [
      { id: "f-sava-antalaha", name: "SAVA Curing Station Antalaha", type: "Curing Station", regionId: "r-mg" },
      { id: "f-sava-sambava", name: "SAVA Collection Centre Sambava", type: "Collection Centre", regionId: "r-mg" },
    ],
    sourcesFrom: [],
  },
  {
    // Feeds BOTH the sunflower oil refiner and the lecithin works.
    id: "s-blacksea", name: "Black Sea Sunseed", tier: 2, reliability: 0.76,
    facilities: [
      { id: "f-blacksea-odesa", name: "Black Sea Crushing Plant Odesa", type: "Seed Crushing Plant", regionId: "r-ua" },
      { id: "f-blacksea-mykolaiv", name: "Black Sea Elevator Mykolaiv", type: "Grain Elevator", regionId: "r-ua" },
    ],
    sourcesFrom: [],
  },
  {
    id: "s-giresun", name: "Giresun Hazelnut Orchards", tier: 2, reliability: 0.81,
    facilities: [{ id: "f-giresun-orchards", name: "Giresun Orchard Cluster", type: "Orchard", regionId: "r-tr" }],
    sourcesFrom: [],
  },
  {
    id: "s-kaimai", name: "Kaimai Pasture Farms", tier: 2, reliability: 0.97,
    facilities: [{ id: "f-kaimai-waikato", name: "Kaimai Farm Collective Waikato", type: "Dairy Farm Collective", regionId: "r-nz" }],
    sourcesFrom: [],
  },
  {
    id: "s-canaverde", name: "Cana Verde Plantations", tier: 2, reliability: 0.88,
    facilities: [{ id: "f-canaverde-piracicaba", name: "Cana Verde Estate Piracicaba", type: "Cane Estate", regionId: "r-br" }],
    sourcesFrom: [],
  },
  {
    id: "s-rheinbeet", name: "RheinBeet Growers", tier: 2, reliability: 0.95,
    facilities: [{ id: "f-rheinbeet-rhineland", name: "RheinBeet Fields Rhineland", type: "Beet Farm Collective", regionId: "r-de" }],
    sourcesFrom: [],
  },
  {
    id: "s-vistula", name: "Vistula Grain Co-operative", tier: 2, reliability: 0.91,
    facilities: [{ id: "f-vistula-lublin", name: "Vistula Elevator Lublin", type: "Grain Elevator", regionId: "r-pl" }],
    sourcesFrom: [],
  },
  {
    id: "s-mielera", name: "Mielera del Sur", tier: 2, reliability: 0.82,
    facilities: [{ id: "f-mielera-entrerios", name: "Mielera Apiary Entre Ríos", type: "Apiary Collective", regionId: "r-ar" }],
    sourcesFrom: [],
  },
  {
    id: "s-marisal", name: "Marisal Sea Salt", tier: 2, reliability: 0.94,
    facilities: [{ id: "f-marisal-guerande", name: "Marisal Salt Marsh Guérande", type: "Salt Marsh", regionId: "r-fr" }],
    sourcesFrom: [],
  },
  {
    id: "s-tanahsawit", name: "Tanah Sawit Estates", tier: 2, reliability: 0.85,
    facilities: [{ id: "f-tanahsawit-sabah", name: "Tanah Sawit Estate Sabah", type: "Palm Estate", regionId: "r-my" }],
    sourcesFrom: [],
  },
  {
    id: "s-nordboard", name: "NordBoard Paper Mill", tier: 2, reliability: 0.93,
    facilities: [{ id: "f-nordboard-lubeck", name: "NordBoard Mill Lübeck", type: "Board Mill", regionId: "r-de" }],
    sourcesFrom: ["s-forestria"],
  },
  {
    id: "s-alumroll", name: "AlumRoll Rolling Mill", tier: 2, reliability: 0.9,
    facilities: [{ id: "f-alumroll-koblenz", name: "AlumRoll Mill Koblenz", type: "Rolling Mill", regionId: "r-de" }],
    sourcesFrom: ["s-bauxa"],
  },
  {
    id: "s-resinova", name: "Resinova Polymers", tier: 2, reliability: 0.89,
    facilities: [{ id: "f-resinova-kertih", name: "Resinova Polymer Plant Kertih", type: "Polymer Plant", regionId: "r-my" }],
    sourcesFrom: ["s-naphtha"],
  },

  // ── Tier 3: base raw materials ──────────────────────────────────────
  {
    id: "s-forestria", name: "Forestria Pulpwood", tier: 3, reliability: 0.92,
    facilities: [{ id: "f-forestria-warmia", name: "Forestria Managed Forest Warmia", type: "Forest Concession", regionId: "r-pl" }],
    sourcesFrom: [],
  },
  {
    id: "s-bauxa", name: "Bauxa Minerals", tier: 3, reliability: 0.87,
    facilities: [{ id: "f-bauxa-para", name: "Bauxa Bauxite Mine Pará", type: "Mine & Refinery", regionId: "r-br" }],
    sourcesFrom: [],
  },
  {
    id: "s-naphtha", name: "Naphtha Gulf Feedstock", tier: 3, reliability: 0.91,
    facilities: [{ id: "f-naphtha-terengganu", name: "Naphtha Cracker Terengganu", type: "Petrochemical Plant", regionId: "r-my" }],
    sourcesFrom: [],
  },
  {
    id: "s-silicane", name: "Silicane Minerals", tier: 3, reliability: 0.94,
    facilities: [{ id: "f-silicane-bohemia", name: "Silicane Sand & Soda Works Bohemia", type: "Mineral Works", regionId: "r-cz" }],
    sourcesFrom: [],
  },
];

export const components: ComponentRow[] = [
  // ── Cocoa: the single-processor spine of the whole portfolio ────────
  { id: "c-cocoa-beans", name: "Fermented Cocoa Beans", category: "agri", criticality: 5, partOf: ["c-cocoa-mass", "c-cocoa-butter", "c-cocoa-powder", "c-cocoa-nibs"], suppliedBy: [{ supplierId: "s-ivoire", leadTimeDays: 45, isPrimary: true }, { supplierId: "s-ashanti", leadTimeDays: 42, isPrimary: false }, { supplierId: "s-andes", leadTimeDays: 52, isPrimary: false }] },
  { id: "c-cocoa-mass", name: "Cocoa Mass", category: "cocoa", criticality: 5, partOf: ["c-couv-dark", "c-couv-milk", "c-cookie-base"], suppliedBy: [{ supplierId: "s-grindwell", leadTimeDays: 20, isPrimary: true }] },
  { id: "c-cocoa-butter", name: "Cocoa Butter", category: "cocoa", criticality: 5, partOf: ["c-couv-dark", "c-couv-milk", "c-couv-white", "c-praline", "c-ganache"], suppliedBy: [{ supplierId: "s-grindwell", leadTimeDays: 24, isPrimary: true }] },
  { id: "c-cocoa-powder", name: "Cocoa Powder", category: "cocoa", criticality: 5, partOf: ["c-cookie-base", "c-wafer", "c-granola-base", "c-icebase"], suppliedBy: [{ supplierId: "s-grindwell", leadTimeDays: 18, isPrimary: true }] },
  { id: "c-cocoa-nibs", name: "Roasted Cocoa Nibs", category: "cocoa", criticality: 3, partOf: ["c-granola-base", "c-cookie-base"], suppliedBy: [{ supplierId: "s-grindwell", leadTimeDays: 22, isPrimary: true }] },

  // ── Couvertures & chocolate bases ──────────────────────────────────
  { id: "c-couv-dark", name: "Dark Chocolate Couverture", category: "couverture", criticality: 5, partOf: ["c-ganache"], suppliedBy: [{ supplierId: "s-couvertura", leadTimeDays: 25, isPrimary: true }] },
  { id: "c-couv-milk", name: "Milk Chocolate Couverture", category: "couverture", criticality: 5, partOf: ["c-ganache", "c-choc-coating"], suppliedBy: [{ supplierId: "s-couvertura", leadTimeDays: 25, isPrimary: true }] },
  { id: "c-couv-white", name: "White Chocolate Base", category: "couverture", criticality: 4, partOf: [], suppliedBy: [{ supplierId: "s-couvertura", leadTimeDays: 24, isPrimary: true }] },
  { id: "c-choc-coating", name: "Milk Chocolate Coating", category: "couverture", criticality: 4, partOf: [], suppliedBy: [{ supplierId: "s-couvertura", leadTimeDays: 20, isPrimary: true }] },
  { id: "c-choc-chips", name: "Dark Chocolate Chips", category: "couverture", criticality: 3, partOf: ["c-granola-base"], suppliedBy: [{ supplierId: "s-couvertura", leadTimeDays: 18, isPrimary: true }] },
  { id: "c-ganache", name: "Truffle Ganache Centre", category: "filling", criticality: 4, partOf: [], suppliedBy: [{ supplierId: "s-couvertura", leadTimeDays: 16, isPrimary: true }] },

  // ── Fillings & nut pastes ──────────────────────────────────────────
  { id: "c-fill-caramel", name: "Salted Caramel Filling", category: "filling", criticality: 3, partOf: [], suppliedBy: [{ supplierId: "s-caramelia", leadTimeDays: 14, isPrimary: true }] },
  { id: "c-praline", name: "Hazelnut Praline Paste", category: "filling", criticality: 4, partOf: ["c-ganache"], suppliedBy: [{ supplierId: "s-pralinart", leadTimeDays: 28, isPrimary: true }] },
  { id: "c-marshmallow", name: "Mini Marshmallows", category: "confection", criticality: 1, partOf: [], suppliedBy: [{ supplierId: "s-caramelia", leadTimeDays: 18, isPrimary: true }] },

  // ── Bakery, cereal & frozen bases ──────────────────────────────────
  { id: "c-cookie-base", name: "Chocolate Cookie Base", category: "bakery", criticality: 3, partOf: [], suppliedBy: [{ supplierId: "s-biscotta", leadTimeDays: 16, isPrimary: true }] },
  { id: "c-wafer", name: "Wafer Sheets", category: "bakery", criticality: 3, partOf: [], suppliedBy: [{ supplierId: "s-biscotta", leadTimeDays: 18, isPrimary: true }] },
  { id: "c-pretzel", name: "Pretzel Sticks", category: "bakery", criticality: 2, partOf: [], suppliedBy: [{ supplierId: "s-biscotta", leadTimeDays: 12, isPrimary: true }] },
  { id: "c-crisp", name: "Crisped Cereal", category: "bakery", criticality: 2, partOf: ["c-granola-base"], suppliedBy: [{ supplierId: "s-biscotta", leadTimeDays: 15, isPrimary: true }] },
  { id: "c-granola-base", name: "Oat Granola Base", category: "cereal", criticality: 3, partOf: [], suppliedBy: [{ supplierId: "s-granolara", leadTimeDays: 20, isPrimary: true }] },
  { id: "c-icebase", name: "Cocoa Ice-Cream Base", category: "frozen", criticality: 4, partOf: [], suppliedBy: [{ supplierId: "s-lactonord", leadTimeDays: 10, isPrimary: true }] },

  // ── Sweeteners ─────────────────────────────────────────────────────
  { id: "c-sugar", name: "Cane Sugar", category: "sweetener", criticality: 4, partOf: ["c-couv-dark", "c-couv-milk", "c-couv-white", "c-choc-coating", "c-choc-chips", "c-fill-caramel", "c-praline", "c-cookie-base", "c-wafer", "c-granola-base", "c-ganache", "c-icebase"], suppliedBy: [{ supplierId: "s-dolcezucar", leadTimeDays: 30, isPrimary: true }, { supplierId: "s-beetzucker", leadTimeDays: 21, isPrimary: false }] },
  { id: "c-glucose", name: "Glucose Syrup", category: "sweetener", criticality: 3, partOf: ["c-fill-caramel", "c-icebase", "c-granola-base", "c-marshmallow"], suppliedBy: [{ supplierId: "s-molinera", leadTimeDays: 18, isPrimary: true }] },
  { id: "c-honey", name: "Wildflower Honey", category: "sweetener", criticality: 2, partOf: ["c-granola-base"], suppliedBy: [{ supplierId: "s-mielera", leadTimeDays: 32, isPrimary: true }] },

  // ── Dairy ──────────────────────────────────────────────────────────
  { id: "c-milk-powder", name: "Whole Milk Powder", category: "dairy", criticality: 4, partOf: ["c-couv-milk", "c-couv-white", "c-icebase"], suppliedBy: [{ supplierId: "s-lactonord", leadTimeDays: 34, isPrimary: true }] },
  { id: "c-skim-powder", name: "Skimmed Milk Powder", category: "dairy", criticality: 3, partOf: ["c-choc-coating", "c-icebase"], suppliedBy: [{ supplierId: "s-lactonord", leadTimeDays: 30, isPrimary: true }] },
  { id: "c-cream", name: "Dairy Cream", category: "dairy", criticality: 3, partOf: ["c-fill-caramel", "c-ganache", "c-icebase"], suppliedBy: [{ supplierId: "s-lactonord", leadTimeDays: 8, isPrimary: true }] },
  { id: "c-milkfat", name: "Anhydrous Milk Fat", category: "dairy", criticality: 3, partOf: ["c-couv-milk", "c-ganache", "c-icebase"], suppliedBy: [{ supplierId: "s-lactonord", leadTimeDays: 26, isPrimary: true }] },
  { id: "c-milk-raw", name: "Raw Farm Milk", category: "agri", criticality: 3, partOf: ["c-milk-powder", "c-skim-powder", "c-cream", "c-milkfat"], suppliedBy: [{ supplierId: "s-kaimai", leadTimeDays: 7, isPrimary: true }] },

  // ── Fats & emulsifiers ─────────────────────────────────────────────
  { id: "c-lecithin", name: "Sunflower Lecithin", category: "emulsifier", criticality: 5, partOf: ["c-couv-dark", "c-couv-milk", "c-couv-white", "c-choc-coating", "c-choc-chips", "c-praline", "c-ganache", "c-icebase"], suppliedBy: [{ supplierId: "s-emulso", leadTimeDays: 26, isPrimary: true }] },
  { id: "c-sunflower-oil", name: "Sunflower Oil", category: "fat", criticality: 3, partOf: ["c-cookie-base", "c-wafer", "c-granola-base", "c-pretzel"], suppliedBy: [{ supplierId: "s-helios-oil", leadTimeDays: 22, isPrimary: true }] },
  { id: "c-palm-oil", name: "RSPO Palm Oil", category: "fat", criticality: 3, partOf: ["c-praline", "c-fill-caramel", "c-choc-coating"], suppliedBy: [{ supplierId: "s-palmara", leadTimeDays: 42, isPrimary: true }] },
  { id: "c-sunseed", name: "Sunflower Seed", category: "agri", criticality: 4, partOf: ["c-sunflower-oil", "c-lecithin"], suppliedBy: [{ supplierId: "s-blacksea", leadTimeDays: 20, isPrimary: true }] },

  // ── Flavours ───────────────────────────────────────────────────────
  { id: "c-vanilla", name: "Vanilla Extract", category: "flavour", criticality: 5, partOf: ["c-couv-dark", "c-couv-milk", "c-couv-white", "c-choc-coating", "c-fill-caramel", "c-cookie-base", "c-ganache", "c-icebase"], suppliedBy: [{ supplierId: "s-vanico", leadTimeDays: 60, isPrimary: true }] },
  { id: "c-vanilla-beans", name: "Cured Vanilla Beans", category: "agri", criticality: 5, partOf: ["c-vanilla"], suppliedBy: [{ supplierId: "s-sava-vanilla", leadTimeDays: 55, isPrimary: true }] },
  { id: "c-coffee-ext", name: "Coffee Extract", category: "flavour", criticality: 2, partOf: ["c-ganache"], suppliedBy: [{ supplierId: "s-vanico", leadTimeDays: 35, isPrimary: true }] },
  { id: "c-mint-oil", name: "Peppermint Oil", category: "flavour", criticality: 2, partOf: ["c-ganache"], suppliedBy: [{ supplierId: "s-vanico", leadTimeDays: 30, isPrimary: true }] },
  { id: "c-orange-oil", name: "Orange Oil", category: "flavour", criticality: 2, partOf: ["c-ganache"], suppliedBy: [{ supplierId: "s-vanico", leadTimeDays: 32, isPrimary: true }] },

  // ── Nuts, inclusions & seasoning ───────────────────────────────────
  { id: "c-hazelnut", name: "Roasted Hazelnuts", category: "nut", criticality: 4, partOf: ["c-praline", "c-granola-base"], suppliedBy: [{ supplierId: "s-nuttoro", leadTimeDays: 35, isPrimary: true }] },
  { id: "c-almond", name: "Roasted Almonds", category: "nut", criticality: 3, partOf: ["c-ganache", "c-granola-base"], suppliedBy: [{ supplierId: "s-nuttoro", leadTimeDays: 32, isPrimary: true }] },
  { id: "c-hazel-inshell", name: "In-shell Hazelnuts", category: "agri", criticality: 4, partOf: ["c-hazelnut"], suppliedBy: [{ supplierId: "s-giresun", leadTimeDays: 30, isPrimary: true }] },
  { id: "c-sea-salt", name: "Atlantic Sea Salt", category: "seasoning", criticality: 2, partOf: ["c-fill-caramel", "c-cookie-base", "c-granola-base", "c-pretzel"], suppliedBy: [{ supplierId: "s-marisal", leadTimeDays: 10, isPrimary: true }] },

  // ── Grains ─────────────────────────────────────────────────────────
  { id: "c-flour", name: "Wheat Flour", category: "grain", criticality: 3, partOf: ["c-cookie-base", "c-wafer", "c-pretzel", "c-crisp"], suppliedBy: [{ supplierId: "s-molinera", leadTimeDays: 14, isPrimary: true }] },
  { id: "c-oats", name: "Rolled Oats", category: "grain", criticality: 3, partOf: ["c-granola-base"], suppliedBy: [{ supplierId: "s-molinera", leadTimeDays: 16, isPrimary: true }] },
  { id: "c-starch", name: "Wheat Starch", category: "grain", criticality: 2, partOf: ["c-wafer", "c-icebase", "c-marshmallow"], suppliedBy: [{ supplierId: "s-molinera", leadTimeDays: 20, isPrimary: true }] },
  { id: "c-wheat", name: "Milling Wheat", category: "agri", criticality: 3, partOf: ["c-flour", "c-oats", "c-starch"], suppliedBy: [{ supplierId: "s-vistula", leadTimeDays: 24, isPrimary: true }] },
  { id: "c-cane", name: "Sugar Cane", category: "agri", criticality: 3, partOf: ["c-sugar"], suppliedBy: [{ supplierId: "s-canaverde", leadTimeDays: 20, isPrimary: true }] },
  { id: "c-beet", name: "Sugar Beet", category: "agri", criticality: 3, partOf: ["c-sugar"], suppliedBy: [{ supplierId: "s-rheinbeet", leadTimeDays: 18, isPrimary: true }] },

  // ── Packaging ──────────────────────────────────────────────────────
  { id: "c-foil", name: "Foil Wrappers", category: "packaging", criticality: 2, partOf: [], suppliedBy: [{ supplierId: "s-foilwrap", leadTimeDays: 15, isPrimary: true }] },
  { id: "c-carton", name: "Printed Cartons", category: "packaging", criticality: 2, partOf: [], suppliedBy: [{ supplierId: "s-cartonex", leadTimeDays: 18, isPrimary: true }, { supplierId: "s-cajamex", leadTimeDays: 26, isPrimary: false }] },
  { id: "c-shipper", name: "Corrugated Shippers", category: "packaging", criticality: 1, partOf: [], suppliedBy: [{ supplierId: "s-cartonex", leadTimeDays: 12, isPrimary: true }, { supplierId: "s-cajamex", leadTimeDays: 20, isPrimary: false }] },
  { id: "c-label", name: "Printed Labels", category: "packaging", criticality: 1, partOf: [], suppliedBy: [{ supplierId: "s-cartonex", leadTimeDays: 10, isPrimary: true }] },
  { id: "c-tray", name: "Moulded Pulp Trays", category: "packaging", criticality: 1, partOf: [], suppliedBy: [{ supplierId: "s-cartonex", leadTimeDays: 14, isPrimary: true }] },
  { id: "c-film", name: "Flow-wrap Film", category: "packaging", criticality: 2, partOf: [], suppliedBy: [{ supplierId: "s-filmtek", leadTimeDays: 30, isPrimary: true }] },
  { id: "c-jar", name: "Glass Jars", category: "packaging", criticality: 3, partOf: [], suppliedBy: [{ supplierId: "s-vitrum", leadTimeDays: 35, isPrimary: true }] },
  { id: "c-jar-lid", name: "Twist-off Jar Lids", category: "packaging", criticality: 2, partOf: ["c-jar"], suppliedBy: [{ supplierId: "s-tinsmith", leadTimeDays: 30, isPrimary: true }] },
  { id: "c-pint-tub", name: "Ice-Cream Pint Tubs", category: "packaging", criticality: 2, partOf: [], suppliedBy: [{ supplierId: "s-frigopack", leadTimeDays: 20, isPrimary: true }] },
  { id: "c-gift-tin", name: "Seasonal Gift Tins", category: "packaging", criticality: 2, partOf: [], suppliedBy: [{ supplierId: "s-tinsmith", leadTimeDays: 45, isPrimary: true }] },
  { id: "c-alu-stock", name: "Aluminium Foil Stock", category: "material", criticality: 2, partOf: ["c-foil", "c-gift-tin", "c-jar-lid"], suppliedBy: [{ supplierId: "s-alumroll", leadTimeDays: 25, isPrimary: true }] },
  { id: "c-board-stock", name: "Folding Boxboard", category: "material", criticality: 2, partOf: ["c-carton", "c-shipper", "c-label", "c-tray", "c-pint-tub"], suppliedBy: [{ supplierId: "s-nordboard", leadTimeDays: 22, isPrimary: true }] },
  { id: "c-resin", name: "Polyolefin Resin", category: "material", criticality: 2, partOf: ["c-film", "c-pint-tub"], suppliedBy: [{ supplierId: "s-resinova", leadTimeDays: 28, isPrimary: true }] },
];

export const products: ProductRow[] = [
  {
    id: "p-bar-dark70", name: "Midnight 70% Dark Bar", category: "Bars", unitsPerYear: 3_200_000,
    contains: [
      { componentId: "c-couv-dark", quantity: 1 }, { componentId: "c-foil", quantity: 1 },
      { componentId: "c-carton", quantity: 1 }, { componentId: "c-label", quantity: 1 },
      { componentId: "c-shipper", quantity: 1 },
    ],
  },
  {
    id: "p-bar-milk", name: "Classic Milk Bar", category: "Bars", unitsPerYear: 6_000_000,
    contains: [
      { componentId: "c-couv-milk", quantity: 1 }, { componentId: "c-foil", quantity: 1 },
      { componentId: "c-carton", quantity: 1 }, { componentId: "c-label", quantity: 1 },
      { componentId: "c-shipper", quantity: 1 },
    ],
  },
  {
    id: "p-bar-hazelnut", name: "Hazelnut Crunch Bar", category: "Bars", unitsPerYear: 2_400_000,
    contains: [
      { componentId: "c-couv-milk", quantity: 1 }, { componentId: "c-praline", quantity: 1 },
      { componentId: "c-hazelnut", quantity: 1 }, { componentId: "c-foil", quantity: 1 },
      { componentId: "c-carton", quantity: 1 }, { componentId: "c-shipper", quantity: 1 },
    ],
  },
  {
    id: "p-bar-caramel", name: "Salted Caramel Bar", category: "Bars", unitsPerYear: 2_100_000,
    contains: [
      { componentId: "c-couv-milk", quantity: 1 }, { componentId: "c-fill-caramel", quantity: 1 },
      { componentId: "c-foil", quantity: 1 }, { componentId: "c-carton", quantity: 1 },
      { componentId: "c-shipper", quantity: 1 },
    ],
  },
  {
    id: "p-bar-white", name: "White Vanilla Bar", category: "Bars", unitsPerYear: 1_150_000,
    contains: [
      { componentId: "c-couv-white", quantity: 1 }, { componentId: "c-vanilla", quantity: 1 },
      { componentId: "c-foil", quantity: 1 }, { componentId: "c-carton", quantity: 1 },
      { componentId: "c-shipper", quantity: 1 },
    ],
  },
  {
    id: "p-truffle-box", name: "Truffle Assortment Box", category: "Confections", unitsPerYear: 850_000,
    contains: [
      { componentId: "c-ganache", quantity: 24 }, { componentId: "c-couv-dark", quantity: 1 },
      { componentId: "c-couv-milk", quantity: 1 }, { componentId: "c-tray", quantity: 1 },
      { componentId: "c-carton", quantity: 1 }, { componentId: "c-label", quantity: 1 },
    ],
  },
  {
    id: "p-spread-hazelnut", name: "Hazelnut Cocoa Spread", category: "Spreads", unitsPerYear: 1_800_000,
    contains: [
      { componentId: "c-praline", quantity: 1 }, { componentId: "c-cocoa-powder", quantity: 1 },
      { componentId: "c-sugar", quantity: 1 }, { componentId: "c-palm-oil", quantity: 1 },
      { componentId: "c-jar", quantity: 1 }, { componentId: "c-label", quantity: 1 },
      { componentId: "c-shipper", quantity: 1 },
    ],
  },
  {
    id: "p-cookies-double", name: "Double-Chocolate Cookies", category: "Bakery", unitsPerYear: 2_600_000,
    contains: [
      { componentId: "c-cookie-base", quantity: 1 }, { componentId: "c-choc-chips", quantity: 1 },
      { componentId: "c-film", quantity: 1 }, { componentId: "c-carton", quantity: 1 },
      { componentId: "c-shipper", quantity: 1 },
    ],
  },
  {
    id: "p-wafer-fingers", name: "Chocolate Wafer Fingers", category: "Bakery", unitsPerYear: 3_400_000,
    contains: [
      { componentId: "c-wafer", quantity: 4 }, { componentId: "c-choc-coating", quantity: 1 },
      { componentId: "c-film", quantity: 1 }, { componentId: "c-carton", quantity: 1 },
      { componentId: "c-shipper", quantity: 1 },
    ],
  },
  {
    id: "p-hotcocoa", name: "Hot Cocoa Mix", category: "Beverages", unitsPerYear: 1_300_000,
    contains: [
      { componentId: "c-cocoa-powder", quantity: 1 }, { componentId: "c-sugar", quantity: 1 },
      { componentId: "c-milk-powder", quantity: 1 }, { componentId: "c-marshmallow", quantity: 1 },
      { componentId: "c-carton", quantity: 1 }, { componentId: "c-label", quantity: 1 },
    ],
  },
  {
    id: "p-icecream-pint", name: "Chocolate Ice-Cream Pints", category: "Frozen", unitsPerYear: 1_600_000,
    contains: [
      { componentId: "c-icebase", quantity: 1 }, { componentId: "c-choc-chips", quantity: 1 },
      { componentId: "c-pint-tub", quantity: 1 }, { componentId: "c-label", quantity: 1 },
      { componentId: "c-shipper", quantity: 1 },
    ],
  },
  {
    id: "p-granola-bars", name: "Cocoa Granola Bars", category: "Snacks", unitsPerYear: 2_900_000,
    contains: [
      { componentId: "c-granola-base", quantity: 1 }, { componentId: "c-choc-coating", quantity: 1 },
      { componentId: "c-film", quantity: 6 }, { componentId: "c-carton", quantity: 1 },
      { componentId: "c-shipper", quantity: 1 },
    ],
  },
  {
    id: "p-pretzels", name: "Chocolate-Dipped Pretzels", category: "Snacks", unitsPerYear: 1_450_000,
    contains: [
      { componentId: "c-pretzel", quantity: 1 }, { componentId: "c-choc-coating", quantity: 1 },
      { componentId: "c-film", quantity: 1 }, { componentId: "c-carton", quantity: 1 },
      { componentId: "c-shipper", quantity: 1 },
    ],
  },
  {
    id: "p-easter-eggs", name: "Easter Egg Collection", category: "Seasonal", unitsPerYear: 950_000,
    contains: [
      { componentId: "c-couv-milk", quantity: 1 }, { componentId: "c-couv-white", quantity: 1 },
      { componentId: "c-praline", quantity: 1 }, { componentId: "c-foil", quantity: 12 },
      { componentId: "c-gift-tin", quantity: 1 }, { componentId: "c-carton", quantity: 1 },
    ],
  },
  {
    id: "p-holiday-box", name: "Holiday Gift Assortment", category: "Seasonal", unitsPerYear: 620_000,
    contains: [
      { componentId: "c-ganache", quantity: 18 }, { componentId: "c-couv-dark", quantity: 1 },
      { componentId: "c-fill-caramel", quantity: 1 }, { componentId: "c-gift-tin", quantity: 1 },
      { componentId: "c-tray", quantity: 1 }, { componentId: "c-label", quantity: 1 },
    ],
  },
];
