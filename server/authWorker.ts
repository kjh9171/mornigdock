import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { DatabaseStorage } from "./storage";
import { User, LoginRequest, RegisterRequest, MfaSetupResponse, MfaVerifyRequest } from "@shared/schema";

const scryptAsync = promisify(scrypt);

/**
 * 비밀번호를 해싱합니다.
 * @param password 해싱할 원본 비밀번호
 * @returns 해싱된 비밀번호와 salt를 포함하는 문자열
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex"); // 16바이트 길이의 랜덤 salt 생성
  const buf = (await scryptAsync(password, salt, 64)) as Buffer; // scrypt를 사용하여 비밀번호 해싱 (salt, 64바이트 키 길이)
  return `${buf.toString("hex")}.${salt}`; // 해싱된 비밀번호와 salt를 .으로 구분하여 반환
}

/**
 * 입력된 비밀번호와 저장된 해싱된 비밀번호를 비교합니다.
 * @param supplied 입력된 비밀번호
 * @param stored 저장된 해싱된 비밀번호 (해싱된 값.salt 형식)
 * @returns 비밀번호가 일치하면 true, 아니면 false
 */
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split("."); // 저장된 비밀번호에서 해싱된 값과 salt 분리
  const hashedBuf = Buffer.from(hashed, "hex"); // 해싱된 값을 Buffer로 변환
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer; // 입력된 비밀번호를 동일한 salt로 해싱
  return timingSafeEqual(hashedBuf, suppliedBuf); // 두 해싱된 값이 시간 공격에 안전하게 일치하는지 비교
}

/**
 * 사용자 정보를 기반으로 JWT 토큰을 생성합니다.
 * @param user 토큰에 포함될 사용자 정보 (id, email, role 등)
 * @param secret JWT 서명에 사용될 비밀 키
 * @returns 생성된 JWT 문자열
 */
export function generateJwtToken(user: Pick<User, 'id' | 'email' | 'role'>, secret: string): string {
  // JWT 페이로드에 사용자 ID, 이메일, 역할을 포함
  // expiresIn: 토큰 유효 기간 (예: 1시간)
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, secret, { expiresIn: '1h' });
}

/**
 * JWT 토큰을 검증하고 디코딩된 페이로드를 반환합니다.
 * @param token 검증할 JWT 문자열
 * @param secret JWT 서명 검증에 사용될 비밀 키
 * @returns 검증된 토큰의 페이로드 또는 검증 실패 시 null
 */
export function verifyJwtToken(token: string, secret: string): User | null {
  try {
    const decoded = jwt.verify(token, secret) as User; // JWT 토큰 검증 및 디코딩
    return decoded; // 디코딩된 페이로드 반환
  } catch (error) {
    console.error("JWT 토큰 검증 실패:", error); // 검증 실패 시 에러 로깅
    return null; // 검증 실패
  }
}

/**
 * 새로운 MFA 비밀을 생성하고 QR 코드 URL을 반환합니다.
 * @param email 사용자 이메일 (QR 코드 레이블에 사용)
 * @returns 생성된 비밀과 QR 코드 URL을 포함하는 객체
 */
export async function generateMfaSecret(email: string): Promise<MfaSetupResponse> {
  const secret = speakeasy.generateSecret({
    name: `Antigravity (${email})`, // TOTP 앱에 표시될 이름
    length: 20, // 비밀 키 길이
  });

  try {
    const qrCode = await qrcode.toDataURL(secret.otpauth_url!); // OTPAuth URL로부터 QR 코드 데이터 URL 생성
    return { secret: secret.base32, qrCode }; // base32 형식의 비밀과 QR 코드 URL 반환
  } catch (error) {
    console.error("QR 코드 생성 실패:", error); // QR 코드 생성 실패 시 에러 로깅
    throw new Error("Failed to generate QR code"); // 에러 발생
  }
}

/**
 * TOTP 토큰을 검증합니다.
 * @param secret 사용자의 MFA 비밀
 * @param token 사용자가 입력한 TOTP 토큰
 * @returns 토큰이 유효하면 true, 아니면 false
 */
export function verifyMfaToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret: secret, // 사용자의 MFA 비밀
    encoding: "base32", // 비밀 인코딩 방식
    token: token, // 사용자가 입력한 TOTP 토큰
  });
}

/**
 * 사용자 등록을 처리합니다.
 * @param request Request 객체 (RegisterRequest 포함)
 * @param env 환경 변수 (JWT_SECRET 등)
 * @returns 성공 시 JWT 및 사용자 정보, 실패 시 에러 응답
 */
export async function handleRegister(request: Request, env: any): Promise<{ user: Pick<User, 'id' | 'email' | 'role' | 'username'>, token: string }> {
  const { username, email, password } = (await request.json()) as RegisterRequest;
  const storage = new DatabaseStorage(env);

  const existingUser = await storage.getUserByUsername(username) || await storage.getUserByEmail(email);
  if (existingUser) {
    throw new Error("Username or Email already exists");
  }

  const hashedPassword = await hashPassword(password);
  const newUser = await storage.createUser({
    username,
    email,
    password: hashedPassword,
    role: "user", // 기본 역할
    isMfaEnabled: false,
    mfaSecret: null,
  });

  if (!newUser) {
    throw new Error("Failed to create user");
  }

  const token = generateJwtToken(newUser, env.JWT_SECRET);
  return { user: newUser, token };
}

/**
 * 사용자 로그인을 처리합니다.
 * @param request Request 객체 (LoginRequest 포함)
 * @param env 환경 변수 (JWT_SECRET 등)
 * @returns 성공 시 JWT 및 사용자 정보, MFA 필요 시 mfaRequired: true, 실패 시 에러 응답
 */
export async function handleLogin(request: Request, env: any): Promise<{ user?: Pick<User, 'id' | 'email' | 'role' | 'username'>, token?: string, mfaRequired?: boolean }> {
  const { email, password, token: mfaToken } = (await request.json()) as LoginRequest;
  const storage = new DatabaseStorage(env);

  const user = await storage.getUserByEmail(email);
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isValidPassword = await comparePasswords(password, user.password);
  if (!isValidPassword) {
    throw new Error("Invalid credentials");
  }

  // MFA 확인
  if (user.isMfaEnabled) {
    if (mfaToken) {
      const isMfaValid = verifyMfaToken(user.mfaSecret!, mfaToken);
      if (!isMfaValid) {
        throw new Error("Invalid MFA Token");
      }
      const token = generateJwtToken(user, env.JWT_SECRET);
      return { user, token, mfaRequired: false };
    } else {
      return { mfaRequired: true };
    }
  } else {
    const token = generateJwtToken(user, env.JWT_SECRET);
    return { user, token, mfaRequired: false };
  }
}

/**
 * MFA 설정을 처리합니다.
 * @param request Request 객체
 * @param env 환경 변수
 * @param user 현재 인증된 사용자 정보 (JWT로부터 디코딩된 정보)
 * @returns 생성된 MFA 비밀 및 QR 코드 URL
 */
export async function handleMfaSetup(request: Request, env: any, user: User): Promise<MfaSetupResponse> {
  const mfaResponse = await generateMfaSecret(user.email);
  return mfaResponse;
}

/**
 * MFA 토큰을 검증하고 사용자의 MFA를 활성화합니다.
 * @param request Request 객체 (MfaVerifyRequest 포함)
 * @param env 환경 변수
 * @param user 현재 인증된 사용자 정보 (JWT로부터 디코딩된 정보)
 * @returns MFA 활성화 성공 여부
 */
export async function handleMfaVerify(request: Request, env: any, user: User): Promise<{ success: boolean }> {
  const { token, secret } = (await request.json()) as MfaVerifyRequest;
  const storage = new DatabaseStorage(env);

  const secretToVerify = secret || user.mfaSecret;
  if (!secretToVerify) {
    throw new Error("MFA not set up for this user");
  }

  const isValid = verifyMfaToken(secretToVerify, token);

  if (isValid) {
    // MFA 설정 중에만 secret을 업데이트 (setup 과정에서만 secret이 전달됨)
    if (secret) {
      await storage.updateUserMfa(user.id, secret, true);
    }
    return { success: true };
  } else {
    throw new Error("Invalid MFA Token");
  }
}



