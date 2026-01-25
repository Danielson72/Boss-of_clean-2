export interface FloridaCity {
  name: string;
  slug: string;
  county: string;
  region: 'south' | 'central' | 'north' | 'panhandle';
  population: number;
  zipCodes: string[];
  nearbyAreas: string[];
  description: string;
}

export const FLORIDA_CITIES: FloridaCity[] = [
  // South Florida
  {
    name: 'Miami',
    slug: 'miami',
    county: 'Miami-Dade',
    region: 'south',
    population: 442241,
    zipCodes: ['33101', '33109', '33125', '33126', '33127', '33128', '33129', '33130', '33131', '33132', '33133', '33134', '33135', '33136', '33137', '33138', '33139', '33140', '33141', '33142', '33143', '33144', '33145', '33146', '33147', '33149', '33150'],
    nearbyAreas: ['Miami Beach', 'Coral Gables', 'Hialeah', 'Doral', 'Kendall'],
    description: 'Miami is South Florida\'s vibrant metropolis, known for its diverse culture, beautiful beaches, and thriving business district.'
  },
  {
    name: 'Fort Lauderdale',
    slug: 'fort-lauderdale',
    county: 'Broward',
    region: 'south',
    population: 182760,
    zipCodes: ['33301', '33304', '33305', '33306', '33308', '33309', '33311', '33312', '33313', '33314', '33315', '33316', '33317', '33319', '33334'],
    nearbyAreas: ['Hollywood', 'Pompano Beach', 'Plantation', 'Davie', 'Weston'],
    description: 'Fort Lauderdale offers stunning beaches, upscale dining, and a network of scenic canals often called the "Venice of America."'
  },
  {
    name: 'West Palm Beach',
    slug: 'west-palm-beach',
    county: 'Palm Beach',
    region: 'south',
    population: 117415,
    zipCodes: ['33401', '33405', '33406', '33407', '33409', '33410', '33411', '33412', '33413', '33414', '33415', '33416', '33417'],
    nearbyAreas: ['Palm Beach', 'Boca Raton', 'Delray Beach', 'Jupiter', 'Wellington'],
    description: 'West Palm Beach combines luxury waterfront living with a vibrant arts and culture scene in Palm Beach County.'
  },
  {
    name: 'Boca Raton',
    slug: 'boca-raton',
    county: 'Palm Beach',
    region: 'south',
    population: 99805,
    zipCodes: ['33427', '33428', '33429', '33431', '33432', '33433', '33434', '33486', '33487', '33488', '33496', '33497', '33498', '33499'],
    nearbyAreas: ['Delray Beach', 'Deerfield Beach', 'Parkland', 'Coral Springs'],
    description: 'Boca Raton is an affluent coastal city known for its beautiful beaches, upscale shopping, and excellent schools.'
  },
  {
    name: 'Hollywood',
    slug: 'hollywood-fl',
    county: 'Broward',
    region: 'south',
    population: 153627,
    zipCodes: ['33019', '33020', '33021', '33022', '33023', '33024', '33025', '33026', '33027', '33028', '33029', '33081', '33083', '33084'],
    nearbyAreas: ['Fort Lauderdale', 'Hallandale Beach', 'Pembroke Pines', 'Miramar'],
    description: 'Hollywood features a beautiful broadwalk beach, diverse neighborhoods, and easy access to both Miami and Fort Lauderdale.'
  },

  // Central Florida
  {
    name: 'Orlando',
    slug: 'orlando',
    county: 'Orange',
    region: 'central',
    population: 307573,
    zipCodes: ['32801', '32803', '32804', '32805', '32806', '32807', '32808', '32809', '32810', '32811', '32812', '32814', '32817', '32818', '32819', '32820', '32821', '32822', '32824', '32825', '32826', '32827', '32828', '32829', '32830', '32831', '32832', '32833', '32835', '32836', '32837', '32839'],
    nearbyAreas: ['Kissimmee', 'Winter Park', 'Altamonte Springs', 'Lake Mary', 'Ocoee'],
    description: 'Orlando is the heart of Central Florida, home to world-famous theme parks and a growing tech and business community.'
  },
  {
    name: 'Tampa',
    slug: 'tampa',
    county: 'Hillsborough',
    region: 'central',
    population: 384959,
    zipCodes: ['33602', '33603', '33604', '33605', '33606', '33607', '33609', '33610', '33611', '33612', '33613', '33614', '33615', '33616', '33617', '33618', '33619', '33620', '33621', '33624', '33625', '33626', '33629', '33634', '33635', '33637'],
    nearbyAreas: ['St. Petersburg', 'Clearwater', 'Brandon', 'Temple Terrace', 'Carrollwood'],
    description: 'Tampa is a major Gulf Coast city offering a mix of urban amenities, waterfront activities, and diverse cultural attractions.'
  },
  {
    name: 'St. Petersburg',
    slug: 'st-petersburg',
    county: 'Pinellas',
    region: 'central',
    population: 258308,
    zipCodes: ['33701', '33702', '33703', '33704', '33705', '33706', '33707', '33708', '33709', '33710', '33711', '33712', '33713', '33714', '33715', '33716'],
    nearbyAreas: ['Clearwater', 'Tampa', 'Largo', 'Pinellas Park', 'Treasure Island'],
    description: 'St. Petersburg is known for its stunning waterfront, world-class museums, and over 360 days of sunshine per year.'
  },
  {
    name: 'Clearwater',
    slug: 'clearwater',
    county: 'Pinellas',
    region: 'central',
    population: 117292,
    zipCodes: ['33755', '33756', '33757', '33758', '33759', '33760', '33761', '33762', '33763', '33764', '33765', '33766', '33767'],
    nearbyAreas: ['St. Petersburg', 'Tampa', 'Dunedin', 'Palm Harbor', 'Safety Harbor'],
    description: 'Clearwater boasts some of America\'s best beaches and a laid-back coastal lifestyle on Florida\'s Gulf Coast.'
  },
  {
    name: 'Kissimmee',
    slug: 'kissimmee',
    county: 'Osceola',
    region: 'central',
    population: 79226,
    zipCodes: ['34741', '34742', '34743', '34744', '34745', '34746', '34747', '34758', '34759'],
    nearbyAreas: ['Orlando', 'St. Cloud', 'Celebration', 'Davenport', 'Lake Buena Vista'],
    description: 'Kissimmee offers affordable living near Orlando\'s attractions with a charming downtown and natural beauty.'
  },

  // North Florida
  {
    name: 'Jacksonville',
    slug: 'jacksonville',
    county: 'Duval',
    region: 'north',
    population: 949611,
    zipCodes: ['32099', '32201', '32202', '32203', '32204', '32205', '32206', '32207', '32208', '32209', '32210', '32211', '32212', '32214', '32216', '32217', '32218', '32219', '32220', '32221', '32222', '32223', '32224', '32225', '32226', '32227', '32228', '32229', '32231', '32233', '32234', '32235', '32236', '32238', '32239', '32240', '32241', '32244', '32245', '32246', '32247', '32250', '32254', '32255', '32256', '32257', '32258', '32266', '32277'],
    nearbyAreas: ['Jacksonville Beach', 'Orange Park', 'St. Augustine', 'Fernandina Beach', 'Neptune Beach'],
    description: 'Jacksonville is Florida\'s largest city by area, offering beaches, urban parks, and a thriving business community.'
  },
  {
    name: 'Gainesville',
    slug: 'gainesville',
    county: 'Alachua',
    region: 'north',
    population: 141085,
    zipCodes: ['32601', '32603', '32605', '32606', '32607', '32608', '32609', '32610', '32611', '32612', '32614', '32627', '32635', '32641', '32653'],
    nearbyAreas: ['Alachua', 'Newberry', 'High Springs', 'Micanopy', 'Archer'],
    description: 'Gainesville is home to the University of Florida and offers a vibrant college-town atmosphere with natural springs nearby.'
  },
  {
    name: 'Tallahassee',
    slug: 'tallahassee',
    county: 'Leon',
    region: 'north',
    population: 196169,
    zipCodes: ['32301', '32302', '32303', '32304', '32305', '32306', '32307', '32308', '32309', '32310', '32311', '32312', '32313', '32314', '32315', '32316', '32317', '32318'],
    nearbyAreas: ['Thomasville', 'Havana', 'Crawfordville', 'Quincy', 'Midway'],
    description: 'Tallahassee is Florida\'s capital city, featuring rolling hills, oak-lined streets, and rich history.'
  },
  {
    name: 'St. Augustine',
    slug: 'st-augustine',
    county: 'St. Johns',
    region: 'north',
    population: 15415,
    zipCodes: ['32080', '32082', '32084', '32085', '32086', '32092', '32095'],
    nearbyAreas: ['Jacksonville', 'Palm Coast', 'Ponte Vedra Beach', 'St. Augustine Beach'],
    description: 'St. Augustine is America\'s oldest city, offering rich history, beautiful beaches, and charming cobblestone streets.'
  },

  // Panhandle
  {
    name: 'Pensacola',
    slug: 'pensacola',
    county: 'Escambia',
    region: 'panhandle',
    population: 52529,
    zipCodes: ['32501', '32502', '32503', '32504', '32505', '32506', '32507', '32508', '32509', '32511', '32512', '32513', '32514', '32516', '32520', '32521', '32522', '32523', '32524', '32526', '32534'],
    nearbyAreas: ['Gulf Breeze', 'Pensacola Beach', 'Milton', 'Pace', 'Navarre'],
    description: 'Pensacola offers stunning Gulf beaches, rich naval history, and a charming downtown with Southern hospitality.'
  },
  {
    name: 'Panama City',
    slug: 'panama-city',
    county: 'Bay',
    region: 'panhandle',
    population: 36484,
    zipCodes: ['32401', '32402', '32403', '32404', '32405', '32406', '32407', '32408', '32409', '32410', '32411', '32412', '32413', '32417'],
    nearbyAreas: ['Panama City Beach', 'Lynn Haven', 'Callaway', 'Springfield'],
    description: 'Panama City is the gateway to beautiful Emerald Coast beaches and offers year-round outdoor activities.'
  },
  {
    name: 'Destin',
    slug: 'destin',
    county: 'Okaloosa',
    region: 'panhandle',
    population: 14046,
    zipCodes: ['32540', '32541'],
    nearbyAreas: ['Fort Walton Beach', 'Niceville', 'Crestview', 'Miramar Beach', 'Santa Rosa Beach'],
    description: 'Destin is famous for its emerald-green waters, white sand beaches, and world-class fishing.'
  },

  // Southwest Florida
  {
    name: 'Naples',
    slug: 'naples',
    county: 'Collier',
    region: 'south',
    population: 21750,
    zipCodes: ['34102', '34103', '34104', '34105', '34108', '34109', '34110', '34112', '34113', '34114', '34116', '34117', '34119', '34120'],
    nearbyAreas: ['Marco Island', 'Bonita Springs', 'Estero', 'Golden Gate'],
    description: 'Naples offers upscale living with pristine beaches, championship golf courses, and fine dining.'
  },
  {
    name: 'Fort Myers',
    slug: 'fort-myers',
    county: 'Lee',
    region: 'south',
    population: 92245,
    zipCodes: ['33901', '33902', '33903', '33905', '33906', '33907', '33908', '33912', '33913', '33916', '33917', '33919'],
    nearbyAreas: ['Cape Coral', 'Bonita Springs', 'Estero', 'Lehigh Acres', 'Fort Myers Beach'],
    description: 'Fort Myers combines historic charm with modern amenities along the beautiful Caloosahatchee River.'
  },
  {
    name: 'Cape Coral',
    slug: 'cape-coral',
    county: 'Lee',
    region: 'south',
    population: 194016,
    zipCodes: ['33904', '33909', '33910', '33914', '33915', '33990', '33991', '33993'],
    nearbyAreas: ['Fort Myers', 'Pine Island', 'Sanibel Island', 'Lehigh Acres'],
    description: 'Cape Coral is known for its extensive canal system, waterfront homes, and relaxed Gulf Coast lifestyle.'
  },
  {
    name: 'Sarasota',
    slug: 'sarasota',
    county: 'Sarasota',
    region: 'central',
    population: 57738,
    zipCodes: ['34230', '34231', '34232', '34233', '34234', '34235', '34236', '34237', '34238', '34239', '34240', '34241', '34242', '34243'],
    nearbyAreas: ['Bradenton', 'Venice', 'Siesta Key', 'Longboat Key', 'Osprey'],
    description: 'Sarasota is a cultural hub with world-class beaches, performing arts, and the famous Ringling Museum.'
  },
];

/**
 * Get a city by its slug
 */
export function getCityBySlug(slug: string): FloridaCity | undefined {
  return FLORIDA_CITIES.find(city => city.slug === slug);
}

/**
 * Get all city slugs for static generation
 */
export function getAllCitySlugs(): string[] {
  return FLORIDA_CITIES.map(city => city.slug);
}

/**
 * Get cities by region
 */
export function getCitiesByRegion(region: FloridaCity['region']): FloridaCity[] {
  return FLORIDA_CITIES.filter(city => city.region === region);
}

/**
 * Get popular cities (by population)
 */
export function getPopularCities(limit: number = 10): FloridaCity[] {
  return [...FLORIDA_CITIES]
    .sort((a, b) => b.population - a.population)
    .slice(0, limit);
}
