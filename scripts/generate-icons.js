// Gera os ícones PWA a partir da sese-logo.jpg usando sharp
const sharp = require("sharp");
const path = require("path");

const input = path.join(__dirname, "../sese-logo.jpg");
const iconsDir = path.join(__dirname, "../public/icons");

async function generate() {
  // 192x192
  await sharp(input)
    .resize(192, 192, { fit: "cover", position: "centre" })
    .png()
    .toFile(path.join(iconsDir, "icon-192.png"));
  console.log("✓ icon-192.png");

  // 512x512
  await sharp(input)
    .resize(512, 512, { fit: "cover", position: "centre" })
    .png()
    .toFile(path.join(iconsDir, "icon-512.png"));
  console.log("✓ icon-512.png");

  // 512x512 maskable (com padding para área segura — 20% de cada lado)
  // A área segura do maskable é o círculo central de 80%
  // Adicionamos fundo azul (#1A6BE8) e centralizamos a logo com padding
  await sharp(input)
    .resize(410, 410, { fit: "cover", position: "centre" })
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: { r: 26, g: 107, b: 232, alpha: 1 }, // cor azul da logo
    })
    .png()
    .toFile(path.join(iconsDir, "icon-maskable-512.png"));
  console.log("✓ icon-maskable-512.png");

  console.log("\nÍcones PWA gerados com sucesso em public/icons/");
}

generate().catch((e) => {
  console.error("Erro:", e.message);
  process.exit(1);
});
