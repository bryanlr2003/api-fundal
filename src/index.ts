// api-fundal/src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

// Routers existentes
import authRouter from './auth.js';
import usuariosRouter from './usuarios.js';
import pacientesRouter from './pacientes.js';
import sesionesRouter from './sesiones.js';
import statsRouter from './stats.js';

// Router nuevo de comentarios de sesión
import comentariosSesionRouter from './routes/comentarios_sesion.js';

const app = express();

/* ------------------------------ MIDDLEWARES ------------------------------ */
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());

/* ------------------------------ BASE DE DATOS ------------------------------ */
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ Falta DATABASE_URL en variables de entorno');
  process.exit(1);
}

// Render y Supabase a veces exigen SSL; no-verify evita fallos
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.set('db', pool);

/* ------------------------------ RUTAS ------------------------------ */
app.use('/auth', authRouter);
app.use('/usuarios', usuariosRouter);
app.use('/pacientes', pacientesRouter);
app.use('/sesiones', sesionesRouter);
app.use('/stats', statsRouter);

// Montamos los endpoints de comentarios bajo /sesiones
app.use('/sesiones', comentariosSesionRouter);

/* ------------------------------ HEALTHCHECK ------------------------------ */
app.get('/health', (_req, res) => res.json({ ok: true }));

/* ------------------------------ ARRANQUE ------------------------------ */
const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`✅ API FUNDAL escuchando en puerto ${PORT}`);
});
