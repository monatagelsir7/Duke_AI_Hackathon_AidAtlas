import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

countries.registerLocale(enLocale);

export interface CountryCoordinates {
  lat: number;
  lng: number;
  name: string;
}

const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Major conflict regions
  'Afghanistan': { lat: 33.9391, lng: 67.7100 },
  'Bangladesh': { lat: 23.6850, lng: 90.3563 },
  'Burkina Faso': { lat: 12.2383, lng: -1.5616 },
  'Cameroon': { lat: 7.3697, lng: 12.3547 },
  'Central African Republic': { lat: 6.6111, lng: 20.9394 },
  'Chad': { lat: 15.4542, lng: 18.7322 },
  'Colombia': { lat: 4.5709, lng: -74.2973 },
  'Democratic Republic of the Congo': { lat: -4.0383, lng: 21.7587 },
  'Ethiopia': { lat: 9.1450, lng: 40.4897 },
  'Haiti': { lat: 18.9712, lng: -72.2852 },
  'Iraq': { lat: 33.2232, lng: 43.6793 },
  'Lebanon': { lat: 33.8547, lng: 35.8623 },
  'Libya': { lat: 26.3351, lng: 17.2283 },
  'Mali': { lat: 17.5707, lng: -3.9962 },
  'Mozambique': { lat: -18.6657, lng: 35.5296 },
  'Myanmar': { lat: 21.9162, lng: 95.9560 },
  'Niger': { lat: 17.6078, lng: 8.0817 },
  'Nigeria': { lat: 9.0820, lng: 8.6753 },
  'Pakistan': { lat: 30.3753, lng: 69.3451 },
  'Palestine': { lat: 31.9522, lng: 35.2332 },
  'Gaza/Palestine': { lat: 31.5, lng: 34.4667 },
  'Somalia': { lat: 5.1521, lng: 46.1996 },
  'South Sudan': { lat: 6.8770, lng: 31.3070 },
  'Sudan': { lat: 12.8628, lng: 30.2176 },
  'Syria': { lat: 34.8021, lng: 38.9968 },
  'Ukraine': { lat: 48.3794, lng: 31.1656 },
  'Venezuela': { lat: 6.4238, lng: -66.5897 },
  'Yemen': { lat: 15.5527, lng: 48.5164 },
  
  // Major donor countries
  'United States': { lat: 37.0902, lng: -95.7129 },
  'United Kingdom': { lat: 55.3781, lng: -3.4360 },
  'Germany': { lat: 51.1657, lng: 10.4515 },
  'France': { lat: 46.2276, lng: 2.2137 },
  'Canada': { lat: 56.1304, lng: -106.3468 },
  'Australia': { lat: -25.2744, lng: 133.7751 },
  'Japan': { lat: 36.2048, lng: 138.2529 },
  'South Korea': { lat: 35.9078, lng: 127.7669 },
  'Netherlands': { lat: 52.1326, lng: 5.2913 },
  'Sweden': { lat: 60.1282, lng: 18.6435 },
  'Norway': { lat: 60.4720, lng: 8.4689 },
  'Denmark': { lat: 56.2639, lng: 9.5018 },
  'Switzerland': { lat: 46.8182, lng: 8.2275 },
  'Belgium': { lat: 50.5039, lng: 4.4699 },
  'Spain': { lat: 40.4637, lng: -3.7492 },
  'Italy': { lat: 41.8719, lng: 12.5674 },
  'India': { lat: 20.5937, lng: 78.9629 },
  'China': { lat: 35.8617, lng: 104.1954 },
  'Brazil': { lat: -14.2350, lng: -51.9253 },
  'Mexico': { lat: 23.6345, lng: -102.5528 },
  'Argentina': { lat: -38.4161, lng: -63.6167 },
  'South Africa': { lat: -30.5595, lng: 22.9375 },
  'Kenya': { lat: -0.0236, lng: 37.9062 },
  'Egypt': { lat: 26.8206, lng: 30.8025 },
  'Turkey': { lat: 38.9637, lng: 35.2433 },
  'Saudi Arabia': { lat: 23.8859, lng: 45.0792 },
  'United Arab Emirates': { lat: 23.4241, lng: 53.8478 },
  'Singapore': { lat: 1.3521, lng: 103.8198 },
  'New Zealand': { lat: -40.9006, lng: 174.8860 },
  'Poland': { lat: 51.9194, lng: 19.1451 },
  'Russia': { lat: 61.5240, lng: 105.3188 },
};

export function getCountryOptions(): Array<{ value: string; label: string }> {
  const countryNames = countries.getNames('en');
  return Object.entries(countryNames).map(([code, name]) => ({
    value: name,
    label: name,
  }));
}

export function getCountryCoordinates(countryName: string): CountryCoordinates | null {
  if (!countryName) return null;
  
  const coords = COUNTRY_COORDINATES[countryName];
  if (coords) {
    return {
      ...coords,
      name: countryName,
    };
  }
  
  return null;
}

export function getCountryName(code: string): string {
  return countries.getName(code, 'en') || code;
}

export function getRandomDonorCountry(): string {
  const donorCountries = [
    'United States',
    'United Kingdom',
    'Germany',
    'France',
    'Canada',
    'Australia',
    'Japan',
    'Netherlands',
    'Sweden',
    'Norway',
    'Denmark',
    'Switzerland',
  ];
  return donorCountries[Math.floor(Math.random() * donorCountries.length)];
}

export function getAllConflictCountries(): string[] {
  return [
    'Afghanistan',
    'Bangladesh',
    'Burkina Faso',
    'Cameroon',
    'Central African Republic',
    'Chad',
    'Colombia',
    'Democratic Republic of the Congo',
    'Ethiopia',
    'Haiti',
    'Iraq',
    'Lebanon',
    'Libya',
    'Mali',
    'Mozambique',
    'Myanmar',
    'Niger',
    'Nigeria',
    'Pakistan',
    'Gaza/Palestine',
    'Somalia',
    'South Sudan',
    'Sudan',
    'Syria',
    'Ukraine',
    'Venezuela',
    'Yemen',
  ];
}
