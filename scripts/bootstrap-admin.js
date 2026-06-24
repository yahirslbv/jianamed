import bcrypt from 'bcrypt';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { isPostgresUrl, loadPreproductionEnvironment } from './deployment-env.js';

function ask(question) {
  const prompt = createInterface({ input: stdin, output: stdout });
  return prompt.question(question).finally(() => prompt.close());
}

function askPassword() {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error('bootstrap:admin requiere una terminal interactiva; no pases contrasenas por argumentos o variables.');
  }
  return new Promise((resolve, reject) => {
    let value = '';
    const onData = (chunk) => {
      const key = chunk.toString();
      if (key === '\u0003') {
        cleanup();
        reject(new Error('Operacion cancelada.'));
      } else if (key === '\r' || key === '\n') {
        cleanup();
        stdout.write('\n');
        resolve(value);
      } else if (key === '\u007f' || key === '\b') {
        value = value.slice(0, -1);
      } else if (!key.startsWith('\u001b')) {
        value += key;
      }
    };
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    stdout.write('Contrasena (no se mostrara): ');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

function validateInput({ name, email, password }) {
  if (name.length < 2 || name.length > 120) throw new Error('El nombre debe tener entre 2 y 120 caracteres.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('El correo no es valido.');
  if (password.length < 12) throw new Error('La contrasena debe tener al menos 12 caracteres.');
  if (Buffer.byteLength(password, 'utf8') > 72) throw new Error('La contrasena supera el limite de 72 bytes UTF-8 de bcrypt.');
}

async function main() {
  await loadPreproductionEnvironment();
  if (!isPostgresUrl()) throw new Error('DATABASE_URL debe apuntar a PostgreSQL; bootstrap:admin no usa SQLite.');
  if ((process.env.NODE_ENV === 'production' || process.env.BOOTSTRAP_PRODUCTION === 'true') && !isPostgresUrl()) {
    throw new Error('SQLite esta bloqueado para el bootstrap de produccion.');
  }

  const name = (await ask('Nombre del administrador: ')).trim();
  const email = (await ask('Correo del administrador: ')).trim().toLowerCase();
  const password = await askPassword();
  validateInput({ name, email, password });

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const [existingEmail, activeAdmins] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.count({ where: { role: 'ADMIN', isActive: true } }),
    ]);
    if (existingEmail) throw new Error('Ya existe una cuenta con ese correo.');

    const confirmation = await ask(activeAdmins
      ? 'Ya existe un ADMIN activo. Escribe CREAR ADMIN ADICIONAL para continuar: '
      : 'Escribe CREAR ADMIN para crear el primer administrador: ');
    const expectedConfirmation = activeAdmins ? 'CREAR ADMIN ADICIONAL' : 'CREAR ADMIN';
    if (confirmation.trim() !== expectedConfirmation) throw new Error('Confirmacion no valida; no se hicieron cambios.');

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash, role: 'ADMIN', isActive: true },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'BOOTSTRAP_ADMIN',
          entity: 'User',
          entityId: user.id,
          details: JSON.stringify({ source: 'bootstrap-admin' }),
        },
      });
    });
    console.log(`Administrador creado correctamente: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`bootstrap:admin fallo: ${error.message}`);
  process.exitCode = 1;
});
