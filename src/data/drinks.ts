export type Category = 'ol' | 'cider' | 'seltzer' | 'vin' | 'sprit' | 'drinker'

export type Vessel =
  | 'can'
  | 'can-tall'
  | 'bottle'
  | 'pint'
  | 'wine-bottle'
  | 'wine-glass'
  | 'flute'
  | 'liquor'
  | 'shot'
  | 'rocks'
  | 'highball'
  | 'martini'
  | 'coupe'
  | 'mug'
  | 'hurricane'
  | 'custom'

export interface Size {
  label: string
  ml: number
}

export interface Drink {
  id: string
  name: string
  category: Category
  /** Alcohol by volume, percent */
  abv: number
  /**
   * 'volume' → the whole serving has the given abv.
   * 'spirit' → the amount is the spirit content of the drink (cl sprit), abv applies to that.
   */
  unit: 'volume' | 'spirit'
  sizes: Size[]
  defaultSize: number
  vessel: Vessel
  liquid: string
  accent: string
  note?: string
}

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'ol', label: 'Øl' },
  { id: 'cider', label: 'Cider og rusbrus' },
  { id: 'seltzer', label: 'Seltzer' },
  { id: 'vin', label: 'Vin' },
  { id: 'sprit', label: 'Sprit' },
  { id: 'drinker', label: 'Drinker' },
]

const can: Size[] = [
  { label: 'Liten', ml: 330 },
  { label: 'Stor', ml: 500 },
]
const tap: Size[] = [
  { label: '0,33 l', ml: 330 },
  { label: '0,4 l', ml: 400 },
  { label: '0,5 l', ml: 500 },
]
const glass: Size[] = [
  { label: 'Glass', ml: 150 },
  { label: 'Stort glass', ml: 200 },
  { label: 'Flaske', ml: 750 },
]
const bubbly: Size[] = [
  { label: 'Glass', ml: 120 },
  { label: 'Stort glass', ml: 160 },
  { label: 'Flaske', ml: 750 },
]
const spirit: Size[] = [
  { label: '2 cl', ml: 20 },
  { label: 'Shot', ml: 40 },
  { label: 'Dobbel', ml: 80 },
]
const mixed = (std: number): Size[] => [
  { label: 'Svak', ml: Math.round(std * 0.5) },
  { label: 'Standard', ml: std },
  { label: 'Dobbel', ml: std * 2 },
]

const beer = (
  id: string,
  name: string,
  abv: number,
  accent: string,
  vessel: Vessel = 'can',
  liquid = '#E8B04A',
  sizes: Size[] = can,
  defaultSize = 1,
): Drink => ({ id, name, category: 'ol', abv, unit: 'volume', sizes, defaultSize, vessel, liquid, accent })

const shot = (id: string, name: string, abv: number, liquid: string, accent: string, note?: string): Drink => ({
  id,
  name,
  category: 'sprit',
  abv,
  unit: 'spirit',
  sizes: spirit,
  defaultSize: 1,
  vessel: 'liquor',
  liquid,
  accent,
  note,
})

const seltzer = (id: string, name: string, accent: string, liquid: string, abv = 4.5): Drink => ({
  id,
  name,
  category: 'seltzer',
  abv,
  unit: 'volume',
  sizes: [
    { label: 'Boks', ml: 330 },
    { label: 'Stor', ml: 500 },
  ],
  defaultSize: 0,
  vessel: 'can-tall',
  liquid,
  accent,
})

const cocktail = (
  id: string,
  name: string,
  abv: number,
  stdMl: number,
  vessel: Vessel,
  liquid: string,
  accent: string,
  note: string,
): Drink => ({
  id,
  name,
  category: 'drinker',
  abv,
  unit: 'spirit',
  sizes: mixed(stdMl),
  defaultSize: 1,
  vessel,
  liquid,
  accent,
  note,
})

export const DRINKS: Drink[] = [
  // Øl
  beer('isbjorn', 'Isbjørn', 4.7, '#DCE6F0'),
  beer('ringnes', 'Ringnes Pils', 4.7, '#C8202F'),
  beer('hansa', 'Hansa Pilsener', 4.7, '#E7E2D6'),
  beer('aass', 'Aass Pils', 4.7, '#1F5B3A'),
  beer('frydenlund', 'Frydenlund', 4.7, '#1C2E5A'),
  beer('tuborg', 'Tuborg Grønn', 4.6, '#2E7D3A'),
  beer('carlsberg', 'Carlsberg', 4.6, '#1F6B3B'),
  beer('heineken', 'Heineken', 5.0, '#2F7F3F', 'bottle', '#3E6B2E', [{ label: 'Flaske', ml: 330 }, { label: 'Boks', ml: 500 }], 0),
  beer('corona', 'Corona Extra', 4.5, '#F2C94C', 'bottle', '#EBCB6A', [{ label: 'Flaske', ml: 355 }], 0),
  beer('grans', 'Grans Pils', 4.7, '#B22A2A'),
  beer('mack', 'Mack Pilsner', 4.5, '#DADDE2'),
  beer('fatol', 'Fatøl', 4.7, '#E8B04A', 'pint', '#E8B04A', tap, 2),
  beer('ipa', 'IPA', 6.5, '#D9822B', 'pint', '#D9822B', tap, 1),
  beer('hvete', 'Hveteøl', 5.2, '#F0C66A', 'pint', '#F0C66A', tap, 2),
  beer('stout', 'Stout / Porter', 5.5, '#2A1B14', 'pint', '#2A1B14', tap, 2),
  beer('lettol', 'Lettøl', 2.5, '#9CC4E4', 'can', '#EBC777'),
  beer('alkfri', 'Alkoholfritt øl', 0, '#A8B3BF', 'can', '#EBC777'),

  // Cider og rusbrus
  { id: 'somersby', name: 'Somersby Eple', category: 'cider', abv: 4.5, unit: 'volume', sizes: can, defaultSize: 0, vessel: 'can-tall', liquid: '#E6C25A', accent: '#6FA63A' },
  { id: 'somersby-b', name: 'Somersby Bringebær', category: 'cider', abv: 4.5, unit: 'volume', sizes: can, defaultSize: 0, vessel: 'can-tall', liquid: '#C2405B', accent: '#B0284A' },
  { id: 'kopp-pear', name: 'Kopparberg Pære', category: 'cider', abv: 4.5, unit: 'volume', sizes: can, defaultSize: 0, vessel: 'can-tall', liquid: '#E9D27A', accent: '#C9A93A' },
  { id: 'kopp-straw', name: 'Kopparberg Jordbær & Lime', category: 'cider', abv: 4.5, unit: 'volume', sizes: can, defaultSize: 0, vessel: 'can-tall', liquid: '#D8435C', accent: '#D8435C' },
  { id: 'smirnoff-ice', name: 'Smirnoff Ice', category: 'cider', abv: 4.5, unit: 'volume', sizes: [{ label: 'Flaske', ml: 275 }, { label: 'Boks', ml: 330 }], defaultSize: 0, vessel: 'bottle', liquid: '#D9DEE3', accent: '#B5162B' },
  { id: 'breezer', name: 'Breezer', category: 'cider', abv: 4.0, unit: 'volume', sizes: [{ label: 'Flaske', ml: 275 }], defaultSize: 0, vessel: 'bottle', liquid: '#F08A3C', accent: '#F08A3C' },
  { id: 'cider-sterk', name: 'Sterk cider', category: 'cider', abv: 7.0, unit: 'volume', sizes: [{ label: 'Flaske', ml: 330 }, { label: 'Stor', ml: 500 }], defaultSize: 0, vessel: 'bottle', liquid: '#E3B64A', accent: '#7A8F3A' },

  // Seltzer
  seltzer('ringnes-seltzer', 'Ringnes Hard Seltzer', '#E9ECEF', '#C8202F'),
  seltzer('fender', 'Fender', '#D9EEF0', '#3FA7B5'),
  seltzer('grans-seltzer', 'Grans Seltzer', '#F1E3EA', '#B22A2A'),
  seltzer('hansa-seltzer', 'Hansa Seltzer', '#E7E2D6', '#D4A23A'),
  seltzer('seltzer', 'Annen hard seltzer', '#E8E8EA', '#9AA3AD'),

  // Vin
  { id: 'rodvin', name: 'Rødvin', category: 'vin', abv: 13.5, unit: 'volume', sizes: glass, defaultSize: 0, vessel: 'wine-glass', liquid: '#7A1630', accent: '#7A1630' },
  { id: 'hvitvin', name: 'Hvitvin', category: 'vin', abv: 12.5, unit: 'volume', sizes: glass, defaultSize: 0, vessel: 'wine-glass', liquid: '#E9DC8C', accent: '#C8B45A' },
  { id: 'rose', name: 'Rosévin', category: 'vin', abv: 12, unit: 'volume', sizes: glass, defaultSize: 0, vessel: 'wine-glass', liquid: '#EBA0A6', accent: '#E08C94' },
  { id: 'prosecco', name: 'Prosecco', category: 'vin', abv: 11, unit: 'volume', sizes: bubbly, defaultSize: 0, vessel: 'flute', liquid: '#EEDC96', accent: '#C9B062' },
  { id: 'champagne', name: 'Champagne', category: 'vin', abv: 12, unit: 'volume', sizes: bubbly, defaultSize: 0, vessel: 'flute', liquid: '#F1DFA0', accent: '#D4B36A' },
  { id: 'cava', name: 'Cava', category: 'vin', abv: 11.5, unit: 'volume', sizes: bubbly, defaultSize: 0, vessel: 'flute', liquid: '#ECD98E', accent: '#BFA25A' },
  { id: 'pappvin', name: 'Vin fra kartong', category: 'vin', abv: 13, unit: 'volume', sizes: [{ label: 'Glass', ml: 150 }, { label: 'Stort glass', ml: 250 }, { label: 'Halv liter', ml: 500 }], defaultSize: 0, vessel: 'wine-bottle', liquid: '#6E1A2C', accent: '#6E1A2C' },
  { id: 'portvin', name: 'Portvin', category: 'vin', abv: 19.5, unit: 'volume', sizes: [{ label: '6 cl', ml: 60 }, { label: '8 cl', ml: 80 }], defaultSize: 0, vessel: 'coupe', liquid: '#5A1424', accent: '#5A1424' },

  // Sprit
  shot('vodka', 'Vodka', 40, '#E8EEF3', '#D7DEE6'),
  shot('gin', 'Gin', 40, '#E4F0EC', '#7FB3A6'),
  shot('rom-lys', 'Lys rom', 37.5, '#EFEBDF', '#C9B98F'),
  shot('rom-mork', 'Mørk rom', 40, '#7A3E14', '#8C4A1B'),
  shot('whisky', 'Whisky', 40, '#C27A2C', '#B06A22'),
  shot('tequila', 'Tequila', 38, '#E6D9A8', '#C8B26A'),
  shot('akevitt', 'Akevitt', 40, '#D3A253', '#B88A3E'),
  shot('cognac', 'Konjakk', 40, '#A65A1F', '#8E4A18'),
  shot('jager', 'Jägermeister', 35, '#3A1E12', '#2E4A2A'),
  shot('fisk', 'Fisk', 30, '#2A2A2E', '#3B3B42', 'Salmiakk'),
  shot('sambuca', 'Sambuca', 38, '#ECEFF1', '#D8DCE0'),
  shot('fireball', 'Fireball', 33, '#B5501D', '#C0392B'),
  shot('baileys', 'Baileys', 17, '#C9A27A', '#5A3A28'),
  shot('likor', 'Annen likør', 20, '#D98FA0', '#B86A7E'),

  // Drinker – mengden er sprit i drinken
  cocktail('gin-tonic', 'Gin & tonic', 40, 40, 'highball', '#E3EEE6', '#9CC9A6', '4 cl gin'),
  cocktail('vodka-rb', 'Vodka Red Bull', 40, 40, 'highball', '#EFD27A', '#3A62B0', '4 cl vodka'),
  cocktail('rom-cola', 'Rom & cola', 37.5, 40, 'highball', '#3A1D10', '#8C4A1B', '4 cl rom'),
  cocktail('whisky-cola', 'Whisky cola', 40, 40, 'highball', '#4A2410', '#B06A22', '4 cl whisky'),
  cocktail('vodka-sprite', 'Vodka & Sprite', 40, 40, 'highball', '#E9F2EE', '#5FB06A', '4 cl vodka'),
  cocktail('mojito', 'Mojito', 37.5, 50, 'highball', '#D9EBC8', '#5FA845', '5 cl lys rom'),
  cocktail('moscow-mule', 'Moscow Mule', 40, 40, 'mug', '#E9E2C8', '#B8733A', '4 cl vodka'),
  cocktail('dark-stormy', "Dark 'n' Stormy", 40, 50, 'highball', '#8A5A2E', '#7A3E14', '5 cl mørk rom'),
  cocktail('margarita', 'Margarita', 38, 60, 'coupe', '#E2E8B0', '#9BB54A', '4 cl tequila, 2 cl triple sec'),
  cocktail('daiquiri', 'Daiquiri', 37.5, 50, 'coupe', '#EEF0D8', '#B9C47A', '5 cl lys rom'),
  cocktail('espresso-martini', 'Espresso Martini', 34, 70, 'martini', '#3A2418', '#6B4630', '5 cl vodka, 2 cl kaffelikør'),
  cocktail('cosmo', 'Cosmopolitan', 38, 55, 'martini', '#E26A80', '#C94A62', '4 cl vodka, 1,5 cl triple sec'),
  cocktail('dry-martini', 'Dry Martini', 33, 75, 'martini', '#EEF1EC', '#8FA88A', '6 cl gin, 1,5 cl vermut'),
  cocktail('negroni', 'Negroni', 27, 90, 'rocks', '#C2301E', '#A82818', '3 cl gin, campari, vermut'),
  cocktail('old-fashioned', 'Old Fashioned', 40, 50, 'rocks', '#B4661E', '#9A5418', '5 cl bourbon'),
  cocktail('long-island', 'Long Island Iced Tea', 39, 100, 'highball', '#9A5A28', '#7A4A20', '5 typer sprit, 10 cl'),
  cocktail('pina-colada', 'Piña Colada', 37.5, 50, 'hurricane', '#F3EBD2', '#E6C35A', '5 cl rom'),
  cocktail('sex-beach', 'Sex on the Beach', 33, 60, 'hurricane', '#F08A4B', '#E2563C', '4 cl vodka, 2 cl peach'),
  cocktail('tequila-sunrise', 'Tequila Sunrise', 38, 45, 'hurricane', '#F2A23A', '#D94E2A', '4,5 cl tequila'),
  {
    id: 'aperol',
    name: 'Aperol Spritz',
    category: 'drinker',
    abv: 9,
    unit: 'volume',
    sizes: [{ label: 'Glass', ml: 200 }, { label: 'Stort glass', ml: 300 }],
    defaultSize: 0,
    vessel: 'wine-glass',
    liquid: '#EE6A2A',
    accent: '#EE6A2A',
    note: 'Aperol, prosecco, soda',
  },
  {
    id: 'mimosa',
    name: 'Mimosa',
    category: 'drinker',
    abv: 6,
    unit: 'volume',
    sizes: [{ label: 'Glass', ml: 150 }],
    defaultSize: 0,
    vessel: 'flute',
    liquid: '#F3B24A',
    accent: '#F3B24A',
    note: 'Musserende og appelsinjuice',
  },
]

export const CUSTOM: Drink = {
  id: 'custom',
  name: 'Egendefinert',
  category: 'sprit',
  abv: 40,
  unit: 'volume',
  sizes: [{ label: '4 cl', ml: 40 }],
  defaultSize: 0,
  vessel: 'custom',
  liquid: '#C9CCD3',
  accent: '#C9CCD3',
}

export const DRINK_BY_ID: Record<string, Drink> = Object.fromEntries(
  [...DRINKS, CUSTOM].map((d) => [d.id, d]),
)
