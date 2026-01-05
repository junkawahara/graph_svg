#!/usr/bin/env node
/**
 * Generate platform-specific icons from SVG
 */
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SVG_PATH = path.join(__dirname, '../assets/icon.svg');
const ASSETS_DIR = path.join(__dirname, '../assets');

// PNG sizes needed
const PNG_SIZES = [16, 32, 48, 64, 128, 256, 512];

async function generatePNGs() {
  console.log('Generating PNG icons...');

  const svgBuffer = fs.readFileSync(SVG_PATH);
  const pngPaths = [];

  for (const size of PNG_SIZES) {
    const outputPath = path.join(ASSETS_DIR, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  Created: icon-${size}.png`);
    pngPaths.push(outputPath);
  }

  return pngPaths;
}

async function generateICO(pngPaths) {
  console.log('Generating Windows .ico...');

  // Use multiple sizes for ICO (16, 32, 48, 256)
  const icoSizes = [16, 32, 48, 256];
  const icoPngs = icoSizes.map(size =>
    path.join(ASSETS_DIR, `icon-${size}.png`)
  );

  const icoBuffer = await pngToIco(icoPngs);
  const icoPath = path.join(ASSETS_DIR, 'icon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  console.log('  Created: icon.ico');
}

async function main() {
  try {
    // Ensure assets directory exists
    if (!fs.existsSync(ASSETS_DIR)) {
      fs.mkdirSync(ASSETS_DIR, { recursive: true });
    }

    const pngPaths = await generatePNGs();
    await generateICO(pngPaths);

    console.log('\nIcon generation complete!');
    console.log('Note: For macOS .icns, use iconutil on a Mac or online converter.');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

main();
