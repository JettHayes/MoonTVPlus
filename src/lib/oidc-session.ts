/* eslint-disable @typescript-eslint/no-explicit-any */

export interface OidcSession {
  sub: string;
  email?: string;
  name?: string;
  trust_level?: number;
  timestamp: number;
}

export const OIDC_SESSION_MAX_AGE_MS = 600_000;

// 构造参与签名的数据，字段顺序必须与校验时一致
function buildSignedPayload(session: {
  sub: string;
  email?: string;
  name?: string;
  trust_level?: number;
  timestamp: number;
}): string {
  return JSON.stringify({
    sub: session.sub,
    email: session.email,
    name: session.name,
    trust_level: session.trust_level,
    timestamp: session.timestamp,
  });
}

// 使用 PASSWORD 生成 HMAC-SHA256 签名(与账号密码登录一致)
async function generateSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 使用 PASSWORD 校验 HMAC-SHA256 签名(与账号密码登录一致)
async function verifySignature(
  data: string,
  secret: string,
  signature: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBuffer = new Uint8Array(
      signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    return await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      encoder.encode(data)
    );
  } catch {
    return false;
  }
}

// 生成带 PASSWORD 签名的 OIDC 会话 cookie 值
export async function signOidcSession(
  data: Omit<OidcSession, 'timestamp'>
): Promise<string> {
  const secret = process.env.PASSWORD;
  if (!secret) {
    throw new Error('PASSWORD is not configured');
  }

  const session: OidcSession = { ...data, timestamp: Date.now() };
  const signature = await generateSignature(buildSignedPayload(session), secret);

  return JSON.stringify({ ...session, signature });
}

// 校验 OIDC 会话 cookie 值，签名不匹配或格式错误返回 null
export async function verifyOidcSession(
  cookieValue?: string | null
): Promise<OidcSession | null> {
  const secret = process.env.PASSWORD;
  if (!cookieValue || !secret) {
    return null;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cookieValue);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const { sub, email, name, trust_level, timestamp, signature } = parsed;

  if (
    typeof sub !== 'string' ||
    typeof timestamp !== 'number' ||
    typeof signature !== 'string'
  ) {
    return null;
  }

  const isValid = await verifySignature(
    buildSignedPayload({ sub, email, name, trust_level, timestamp }),
    secret,
    signature
  );

  if (!isValid) {
    return null;
  }

  return { sub, email, name, trust_level, timestamp };
}
