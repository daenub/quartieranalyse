import { promises as fs } from "fs";

const files = await fs.readdir("data");
const chunks = files.filter((file) => file.startsWith("chunk-"));
const data = await Promise.all(
  chunks.map((chunk) => fs.readFile(`data/${chunk}`))
);

const merged = data.reduce((acc, chunk) => {
  const parsed = JSON.parse(chunk);
  parsed.features.forEach((feature) => {
    feature.geometry.coordinates[0].forEach((coord) => {
      coord[0] = +coord[0].toFixed(5);
      coord[1] = +coord[1].toFixed(5);
    });
  });
  if (acc) {
    acc.features.push(...parsed.features);
  } else {
    acc = parsed;
  }

  return acc;
}, null);

await fs.writeFile("public/data.json", JSON.stringify(merged));
