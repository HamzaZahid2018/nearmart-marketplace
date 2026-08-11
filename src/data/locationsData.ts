/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PakistanCity {
  cityName: string;
  province: string;
  coords: [number, number]; // [lat, lng]
  areas: string[];
}

export const PAKISTAN_LOCATIONS: PakistanCity[] = [
  {
    cityName: 'Lahore',
    province: 'Punjab',
    coords: [31.5204, 74.3587],
    areas: [
      'Gulberg III',
      'DHA Phase 5',
      'Johar Town',
      'Model Town',
      'Cantt',
      'Mall Road',
      'Bahria Town',
      'Ferozepur Road',
      'Askari 11',
      'LUMS Campus',
      'Garden Town',
      'Wapda Town',
      'Lake City'
    ]
  },
  {
    cityName: 'Karachi',
    province: 'Sindh',
    coords: [24.8607, 67.0011],
    areas: [
      'Clifton Block 5',
      'DHA Phase 6',
      'Gulshan-e-Iqbal',
      'North Nazimabad',
      'PECHS Block 2',
      'Tariq Road',
      'Saddar Bazar',
      'Bahria Town Karachi',
      'Korangi Industrial Area',
      'Federal B Area',
      'Malir Cantt',
      'Gulistan-e-Johar'
    ]
  },
  {
    cityName: 'Islamabad',
    province: 'Capital',
    coords: [33.6844, 73.0479],
    areas: [
      'F-6 Markaz',
      'F-7 Markaz',
      'F-8 Sector',
      'G-9 Markaz',
      'Blue Area',
      'E-11 Sector',
      'DHA Phase 2',
      'Bahria Town Enclave',
      'I-8 Sector',
      'F-10 Markaz',
      'G-11 Sector'
    ]
  },
  {
    cityName: 'Rawalpindi',
    province: 'Punjab',
    coords: [33.5651, 73.0169],
    areas: [
      'Saddar Commercial',
      'Satellite Town',
      'Bahria Town Phase 7',
      'Westridge',
      'Commercial Market',
      'Adiala Road',
      'Chaklala Scheme 3',
      'Gulraiz Housing',
      'Peshawar Road'
    ]
  },
  {
    cityName: 'Multan',
    province: 'Punjab',
    coords: [30.1575, 71.5249],
    areas: [
      'Gulgasht Colony',
      'Bosan Road',
      'Multan Cantt',
      'Shah Rukn-e-Alam',
      'Model Town Northern',
      'Chowk Kumharanwala',
      'Officers Colony',
      'Wapda Town Multan'
    ]
  },
  {
    cityName: 'Bahawalpur (BWP)',
    province: 'Punjab',
    coords: [29.3544, 71.6911],
    areas: [
      'Model Town A',
      'Model Town B',
      'Satellite Town',
      'Bahawalpur Cantt',
      'One Unit Staff Colony',
      'Farid Gate',
      'University Chowk',
      'Shadman City',
      'Dubai Palace Area'
    ]
  },
  {
    cityName: 'Rahim Yar Khan (RYK)',
    province: 'Punjab',
    coords: [28.4212, 70.2989],
    areas: [
      'Model Town',
      'Abbasia Town',
      'Satellite Town',
      'Gulshan-e-Iqbal',
      'Town Hall Road',
      'Airport Road',
      'Trust Colony',
      'Chak 80/P'
    ]
  },
  {
    cityName: 'Peshawar',
    province: 'KPK',
    coords: [34.0151, 71.5249],
    areas: [
      'Hayatabad Phase 3',
      'University Town',
      'Peshawar Cantt',
      'Saddar Bazaar',
      'Karkhano Market',
      'Ring Road',
      'Warsak Road'
    ]
  },
  {
    cityName: 'Quetta',
    province: 'Balochistan',
    coords: [30.1798, 66.9750],
    areas: [
      'Jinnah Road',
      'Quetta Cantt',
      'Satellite Town',
      'Samungli Road',
      'Shahrah-e-Iqbal',
      'Hazara Town',
      ' Zarghoon Road'
    ]
  },
  {
    cityName: 'Faisalabad',
    province: 'Punjab',
    coords: [31.4504, 73.1350],
    areas: [
      'D Ground',
      'Peoples Colony No. 1',
      'Kohinoor City',
      'Gulberg Colony',
      'Canal Road',
      'Clock Tower Square',
      'Susan Road'
    ]
  },
  {
    cityName: 'Gujranwala',
    province: 'Punjab',
    coords: [32.1877, 74.1945],
    areas: [
      'DC Road',
      'Satellite Town',
      'Model Town',
      'Civil Lines',
      'Garden Town',
      'GT Road',
      'People’s Colony'
    ]
  },
  {
    cityName: 'Sialkot',
    province: 'Punjab',
    coords: [32.4945, 74.5229],
    areas: [
      'Model Town',
      'Sialkot Cantt',
      'Paris Road',
      'Kashmir Road',
      'Defence Road',
      'Ugoki'
    ]
  },
  {
    cityName: 'Hyderabad',
    province: 'Sindh',
    coords: [25.3960, 68.3578],
    areas: [
      'Auto Bhan Road',
      'Latifabad Unit 7',
      'Qasimabad',
      'Saddar Bazaar',
      'Citizens Colony',
      'Hirabad'
    ]
  },
  {
    cityName: 'Sukkur',
    province: 'Sindh',
    coords: [27.7052, 68.8574],
    areas: [
      'Military Road',
      'Clock Tower Sukkur',
      'Saddar Bazar',
      'Cooperative Housing Society',
      'Bunder Road',
      'New Gotkar'
    ]
  }
];

export function getCityCoords(locationString: string): [number, number] {
  if (!locationString) return [31.5204, 74.3587]; // Default Lahore

  const lower = locationString.toLowerCase();
  for (const city of PAKISTAN_LOCATIONS) {
    if (lower.includes(city.cityName.toLowerCase())) {
      return city.coords;
    }
  }

  // Fallback to Lahore
  return [31.5204, 74.3587];
}
