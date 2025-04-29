// inject-sri.js
import fs from 'fs';
import path from 'path';

const buildDir = './build';
const sriHashes = JSON.parse(fs.readFileSync(path.join(buildDir, 'sri-hashes.json'), 'utf-8'));

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

function isExternal(url) {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
}

function injectSRI(htmlContent, filePath) {
  let warnings = [];

  const updatedContent = htmlContent
    // Match any <script> tag with a src= attribute
    .replace(/<script\b[^>]*src="([^"]+)"[^>]*>/g, (match, src) => {
      if (isExternal(src)) return match;

      const cleanSrc = src.replace(/^\//, '');
      const filenameOnly = path.basename(cleanSrc);
      const hash = sriHashes[filenameOnly];

      if (hash) {
        const withoutIntegrity = match
          .replace(/\s+integrity="[^"]*"/, '')
          .replace(/\s+crossorigin="[^"]*"/, '');
        return withoutIntegrity.replace(/>$/, ` integrity="${hash}" crossorigin="anonymous">`);
      } else {
        warnings.push(`⚠️ Missing SRI hash for <script src="${src}"> in ${filePath}`);
        return match;
      }
    })

    // Match any <link> tag with rel=stylesheet and href=, regardless of order
    .replace(/<link\b[^>]*href="([^"]+)"[^>]*rel=["']stylesheet["'][^>]*>/g, (match, href) => {
      if (isExternal(href)) return match;

      const cleanHref = href.replace(/^\//, '');
      const filenameOnly = path.basename(cleanHref);
      const hash = sriHashes[filenameOnly];

      if (hash) {
        const withoutIntegrity = match
          .replace(/\s+integrity="[^"]*"/, '')
          .replace(/\s+crossorigin="[^"]*"/, '');
        return withoutIntegrity.replace(/>$/, ` integrity="${hash}" crossorigin="anonymous">`);
      } else {
        warnings.push(`⚠️ Missing SRI hash for <link href="${href}"> in ${filePath}`);
        return match;
      }
    });

  return { updatedContent, warnings };
}

const allFiles = getAllFiles(buildDir);
let totalWarnings = [];

allFiles.forEach(filePath => {
  if (filePath.endsWith('.html')) {
    console.log(`🧪 Processing ${filePath}`);
    const html = fs.readFileSync(filePath, 'utf-8');
    const { updatedContent, warnings } = injectSRI(html, path.relative(buildDir, filePath));
    fs.writeFileSync(filePath, updatedContent);
    console.log(`✅ Injected SRI into ${path.relative(buildDir, filePath)}`);
    totalWarnings.push(...warnings);
  }
});

if (totalWarnings.length > 0) {
  console.warn('\n=== SRI Injection Warnings ===');
  totalWarnings.forEach(warning => console.warn(warning));
  console.warn('=== End of Warnings ===\n');
  process.exitCode = 1;
} else {
  console.log('✅ All HTML files updated. No warnings.');
}
