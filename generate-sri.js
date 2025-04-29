// generate-sri.js
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const buildDir = './build';

const sriHashes = {};

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

const allFiles = getAllFiles(buildDir);

allFiles.forEach(filePath => {
  if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
    const data = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha384').update(data).digest('base64');
    const relativePath = path.relative(buildDir, filePath);
    sriHashes[relativePath.replace(/\\/g, '/')] = `sha384-${hash}`;
  }
});

fs.writeFileSync(path.join(buildDir, 'sri-hashes.json'), JSON.stringify(sriHashes, null, 2));
console.log('✅ SRI hashes generated.');
