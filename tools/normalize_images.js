const fs = require('fs').promises;
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'img');
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;

const toImageFile = (nome) =>
  nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const res = path.join(dir, e.name);
    if (e.isDirectory()) {
      // skip dot folders
      if (e.name.startsWith('.')) continue;
      files.push(...(await walk(res)));
    } else if (e.isFile() && IMAGE_EXT.test(e.name)) {
      files.push(res);
    }
  }
  return files;
}

async function removeEmptyDirs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  if (entries.length === 0) {
    await fs.rmdir(dir);
    return true;
  }
  for (const e of entries) {
    const res = path.join(dir, e.name);
    if (e.isDirectory()) {
      const removed = await removeEmptyDirs(res);
      if (removed) {
        // try again
      }
    }
  }
  const after = await fs.readdir(dir);
  if (after.length === 0 && dir !== ROOT) {
    await fs.rmdir(dir);
    return true;
  }
  return false;
}

async function main() {
  try {
    const allFiles = await walk(ROOT);
    const toMove = allFiles.filter((f) => path.dirname(f) !== ROOT);

    if (toMove.length === 0) {
      console.log('Nenhuma imagem encontrada em subpastas. Nada a fazer.');
      return;
    }

    const map = {};

    for (const filePath of toMove) {
      const rel = path.relative(ROOT, filePath).split(path.sep).join('/');
      const parent = path.basename(path.dirname(filePath));
      const fileName = path.basename(filePath, path.extname(filePath));
      const ext = path.extname(filePath).toLowerCase();

      // Prioritize parent folder name as the product name; fallback to file name
      const candidateName = parent && parent !== '.' ? parent : fileName;
      let base = toImageFile(candidateName || fileName);
      if (!base) base = toImageFile(fileName || 'image');

      let target = path.join(ROOT, `${base}${ext}`);
      let counter = 1;
      while (true) {
        try {
          await fs.access(target);
          // exists -> bump
          target = path.join(ROOT, `${base}-${counter}${ext}`);
          counter++;
        } catch (err) {
          // not exists
          break;
        }
      }

      await fs.rename(filePath, target);
      const newRel = path.relative(ROOT, target).split(path.sep).join('/');
      map[rel] = newRel;
      console.log(`Movido: ${rel} -> ${newRel}`);
    }

    // remove empty dirs under ROOT
    const entries = await fs.readdir(ROOT, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        await removeEmptyDirs(path.join(ROOT, e.name));
      }
    }

    const mapPath = path.join(ROOT, 'image-map.json');
    await fs.writeFile(mapPath, JSON.stringify(map, null, 2), 'utf8');
    console.log(`
Concluído. Mapeamento salvo em ${mapPath}`);
    console.log('Revise image-map.json e atualize Firestore se necessário.');
  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
}

if (require.main === module) main();
