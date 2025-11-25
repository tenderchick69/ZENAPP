import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ADMIN_PASSWORD } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { password } = await request.json();

    if (!ADMIN_PASSWORD) {
      throw error(500, 'Admin password not configured');
    }

    if (password === ADMIN_PASSWORD) {
      return json({ valid: true });
    } else {
      return json({ valid: false }, { status: 401 });
    }
  } catch (e: any) {
    console.error('Password verification error:', e);
    throw error(500, 'Password verification failed');
  }
};
