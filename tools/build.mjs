import { mkdir, copyFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export async function build() {
  const output = path.join(root, 'dist');
  await mkdir(output, { recursive: true });
  await copyFile(path.join(root, 'index.html'), path.join(output, 'index.html'));
  for (const directory of ['style', 'scripts', 'images']) {
    await cp(path.join(root, directory), path.join(output, directory), { recursive: true });
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
  console.log('Site preparado em dist/ (somente arquivos públicos).');
}
