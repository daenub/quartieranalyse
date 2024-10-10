import { promises as fs } from "fs";

const BASE_URL =
  "https://maps.zh.ch/wfs/OGDZHWFS?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=ms%3Aogd-0485_stat_quartiere_f&SRSNAME=urn:ogc:def:crs:EPSG::4326&OUTPUTFORMAT=application%2Fjson%3B%20subtype%3Dgeojson";
const COUNT = 1000;

let index = 0;

async function fetchGeoJson() {
  console.log(`Fetching chunk ${index}`);
  const response = await fetch(
    `${BASE_URL}&startIndex=${index * COUNT}&count=${COUNT}`
  );
  const data = await response.json();
  index++;

  if (data.features.length === 0) {
    return null;
  }

  return data;
}

let chunk;
while ((chunk = await fetchGeoJson())) {
  await fs.writeFile(`data/chunk-${index - 1}.json`, JSON.stringify(chunk));
}
