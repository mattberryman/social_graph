import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { minify as htmlMinify } from 'html-minifier-terser';
import CleanCSS from 'clean-css';
import { minify as terserMinify } from 'terser';

const filesToHash = ['styles.css'];
const imageDir = 'img';
const outputDir = 'build';
const __dirname = path.resolve();

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function hashContent(content) {
  if (typeof content !== 'string' && !Buffer.isBuffer(content)) {
    throw new Error(`Invalid content for hashing: ${typeof content}`);
  }
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 10);
}

async function cacheBust() {
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  ensureDir(path.join(outputDir, 'img'));

  let htmlRaw = fs.readFileSync('index.html', 'utf8');

  for (const file of filesToHash) {
    const raw = fs.readFileSync(file, 'utf8');
    let minified;

    if (file.endsWith('.css')) {
      const output = new CleanCSS().minify(raw);
      if (output.errors.length > 0) {
        throw new Error(`CSS minification failed:\n${output.errors.join('\n')}`);
      }
      minified = output.styles;
    } else if (file.endsWith('.js')) {
      const result = await terserMinify(raw);
      if (!result.code) throw new Error('JS minification failed.');
      minified = result.code;
    }

    const hash = hashContent(minified);
    const ext = path.extname(file);
    const base = path.basename(file, ext);
    const newFilename = `${base}.${hash}${ext}`;
    const destPath = path.join(outputDir, newFilename);

    fs.writeFileSync(destPath, minified, 'utf8');
    console.log(`✅ Minified ${file} → ${newFilename}`);

    const regex = new RegExp(file.replace('.', '\\.'), 'g');
    htmlRaw = htmlRaw.replace(regex, newFilename);
  }

  // Handle image copying + hash-based renaming
  fs.readdirSync(imageDir).forEach(file => {
    const filepath = path.join(imageDir, file);
    if (fs.statSync(filepath).isFile()) {
      const content = fs.readFileSync(filepath);
      const hash = hashContent(content);
      const ext = path.extname(file);
      const base = path.basename(file, ext);
      const newFilename = `${base}.${hash}${ext}`;
      const destPath = path.join(outputDir, 'img', newFilename);
      fs.copyFileSync(filepath, destPath);
      console.log(`📦 Copied image ${file} → ${newFilename}`);
      htmlRaw = htmlRaw.replace(new RegExp(`img/${file.replace('.', '\\.')}`, 'g'), `img/${newFilename}`);
    }
  });

  const htmlMinified = await htmlMinify(htmlRaw, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    minifyCSS: true,
    minifyJS: true,
    sortAttributes: true,
    sortClassName: true
  });

  fs.writeFileSync(path.join(outputDir, 'index.html'), htmlMinified, 'utf8');
  console.log('🎉 Wrote minified and cache-busted build/index.html');
}

cacheBust().catch(err => {
  console.error('💥 Build failed:', err);
  process.exit(1);
});
