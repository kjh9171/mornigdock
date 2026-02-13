import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

const scryptAsync = promisify(scrypt);

// Extended Request type for session
declare global {
  namespace Express {
    interface User extends User {}
  }
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const MemoryStore = require("memorystore")(session);

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "antigravity_secret",
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
    cookie: { secure: false }, // Set true in production with https
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Allow login with Email OR Username
        const user = await storage.getUserByUsername(username) || await storage.getUserByEmail(username);
        
        if (!user) {
          return done(null, false, { message: "Invalid credentials" });
        }
        
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid credentials" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // === AUTH ROUTES ===

  // REGISTER
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username) || await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "Username or Email already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        role: "user", // Default role
      });

      // Auto-login after register
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  // LOGIN (With MFA check)
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", async (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(400).json({ message: info?.message || "Login failed" });
      }

      // Check MFA
      if (user.isMfaEnabled) {
        if (req.body.token) {
           // Verify TOTP
           const isValid = speakeasy.totp.verify({
             secret: user.mfaSecret!,
             encoding: "base32",
             token: req.body.token
           });
           
           if (!isValid) {
             return res.status(401).json({ message: "Invalid MFA Token" });
           }
           // Valid MFA -> Proceed to login
           req.login(user, (err) => {
             if (err) return next(err);
             return res.json({ user, mfaRequired: false });
           });
        } else {
           // Password correct, but MFA needed
           return res.json({ user: null, mfaRequired: true }); 
        }
      } else {
        // No MFA -> Proceed to login
        req.login(user, (err) => {
          if (err) return next(err);
          res.json({ user, mfaRequired: false });
        });
      }
    })(req, res, next);
  });

  // LOGOUT
  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // ME
  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // MFA SETUP (Generate Secret)
  app.post("/api/auth/mfa/setup", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const secret = speakeasy.generateSecret({ 
      name: `Antigravity (${req.user!.email})` 
    });
    
    try {
      const imageUrl = await qrcode.toDataURL(secret.otpauth_url!);
      res.json({ secret: secret.base32, qrCode: imageUrl });
    } catch (err) {
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // MFA VERIFY (Enable MFA)
  app.post("/api/auth/mfa/verify", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { token, secret } = req.body;
    
    const secretToVerify = secret || req.user!.mfaSecret;
    if (!secretToVerify) return res.status(400).json({ message: "MFA not setup" });

    const isValid = speakeasy.totp.verify({
      secret: secretToVerify,
      encoding: "base32",
      token: token
    });
    
    if (isValid) {
      if (secret) {
        await storage.updateUserMfa(req.user!.id, secret, true);
      }
      res.sendStatus(200);
    } else {
      res.status(400).json({ message: "Invalid Token" });
    }
  });
}
