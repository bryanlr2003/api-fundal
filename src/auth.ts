// api-fundal/src/auth.ts
import { Router } from "express";
import { pool } from "./db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// importa SOLO el valor en runtime
import { requireAuth } from "./mw/auth.js";
// importa el TIPO como type-only (no aparece en runtime)
import type { AuthedRequest } from "./mw/auth.js";

const router = Router();

/** 
 * Firma JWT correctamente tipado (evita errores con exactOptionalPropertyTypes)
 */
const sign = (p: Record<string, unknown>): string => {
  const secret = process.env.JWT_SECRET as string;

  // Garantiza valor válido (string | number) y no undefined
  const raw = process.env.JWT_EXPIRES ?? "2h";
  const expiresIn: string | number =
    /^\d+$/.test(String(raw)) ? Number(raw) : String(raw);
  const opts = { expiresIn } as unknown as jwt.SignOptions;
  return jwt.sign(p, secret, opts);
};

/** 
 * Compara hash si lo es, si no, compara texto plano (temporal)
 */
async function checkPassword(input: string, stored: string): Promise<boolean> {
  if (stored.startsWith("$2")) return bcrypt.compare(input, stored); // bcrypt hash
  return input === stored; // texto plano temporal
}

/** 
 * Retorna el usuario autenticado actual
 */
router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = (req as AuthedRequest).user as any;
    if (!user) return res.status(401).json({ error: "No autenticado" });

    res.json({
      id: user.id,
      rol: user.rol,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
    });
  } catch (e: any) {
    console.error("Error en /me:", e);
    res.status(500).json({ error: "Error interno" });
  }
});

/** 
 * Login: valida usuario y devuelve JWT
 */
router.post("/login", async (req, res) => {
  try {
    let { email, password } = (req.body ?? {}) as {
      email?: string;
      password?: string;
    };

    if (!email || !password)
      return res.status(400).json({ error: "Faltan credenciales" });

    email = String(email).trim().toLowerCase();

    const q = `
      SELECT id, rol, nombre, apellido, email, password_hash, activo
      FROM public.usuarios
      WHERE email = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(q, [email]);
    const u = rows[0];

    if (!u || !u.activo)
      return res.status(401).json({ error: "Usuario/clave inválidos" });

    const ok = await checkPassword(password, u.password_hash);
    if (!ok)
      return res.status(401).json({ error: "Usuario/clave inválidos" });

    const token = sign({
      id: u.id,
      rol: u.rol,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
    });

    res.json({
      token,
      usuario: {
        id: u.id,
        rol: u.rol,
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email,
      },
    });
  } catch (e) {
    console.error("Error en /login:", e);
    res.status(500).json({ error: "Error interno" });
  }
});

export default router;
