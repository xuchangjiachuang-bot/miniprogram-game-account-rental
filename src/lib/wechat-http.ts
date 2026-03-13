import https from 'https';

const TLS_ERROR_CODES = new Set([
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
]);

function getErrorCode(error: unknown) {
  if (!error || typeof error !== 'object') {
    return '';
  }

  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.cause?.code || candidate.code || '';
}

function isWechatTlsFailure(error: unknown) {
  const code = getErrorCode(error);
  if (TLS_ERROR_CODES.has(code)) {
    return true;
  }

  if (!error || typeof error !== 'object') {
    return false;
  }

  const message = String((error as { message?: string }).message || '');
  return /self-signed certificate|certificate/i.test(message);
}

type WechatJsonResponse<T> = {
  status: number;
  ok: boolean;
  data: T;
};

function fetchWechatJsonInsecure<T>(url: string) {
  return new Promise<WechatJsonResponse<T>>((resolve, reject) => {
    const request = https.get(
      url,
      {
        rejectUnauthorized: false,
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on('end', () => {
          try {
            const raw = Buffer.concat(chunks).toString('utf8');
            const data = JSON.parse(raw) as T;
            resolve({
              status: response.statusCode || 200,
              ok: (response.statusCode || 200) >= 200 && (response.statusCode || 200) < 300,
              data,
            });
          } catch (parseError) {
            reject(parseError);
          }
        });
      }
    );

    request.on('error', reject);
  });
}

export async function fetchWechatJson<T>(url: string, init?: RequestInit): Promise<WechatJsonResponse<T>> {
  try {
    const response = await fetch(url, init);
    const data = (await response.json()) as T;
    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    if (!isWechatTlsFailure(error)) {
      throw error;
    }

    console.warn('[wechat-http] TLS verification failed, retrying WeChat request with relaxed TLS', {
      url,
      code: getErrorCode(error),
    });

    return fetchWechatJsonInsecure<T>(url);
  }
}
