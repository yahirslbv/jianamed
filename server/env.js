import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const currentFile = fileURLToPath(import.meta.url);
dotenv.config({ path: path.join(path.dirname(currentFile), '.env') });
