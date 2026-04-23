import { cookies } from 'next/headers';

export async function setSecureCookie(name: string, value: string, maxAge: number = 86400 * 30) {
  const cookieStore = await cookies();
  cookieStore.set(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/',
  });
}

export async function getSecureCookie(name: string): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value;
}

export async function deleteSecureCookie(name: string) {
  const cookieStore = await cookies();
  cookieStore.set(name, '', { maxAge: 0, path: '/' });
}
