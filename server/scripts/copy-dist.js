const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const distDir = path.join(__dirname, '..', 'dist');

function rmrf(dir) {
  if (fs.existsSync(dir)) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.lstatSync(full);
      if (stat.isDirectory()) rmrf(full);
      else fs.unlinkSync(full);
    }
    fs.rmdirSync(dir);
  }
}

function copyRecursive(src, dest) {
  const stat = fs.lstatSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync(srcDir)) {
  console.error('No src directory found to build.');
  process.exit(1);
}

rmrf(distDir);
fs.mkdirSync(distDir, { recursive: true });
copyRecursive(srcDir, distDir);
console.log('Build completed: copied src -> dist');
