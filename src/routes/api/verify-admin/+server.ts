import { json } from '@sveltejs/kit';
import { ADMIN_PASSWORD } from '$env/static/private';

export const POST = async ({ request }) => {
  const { code } = await request.json();
  return json({ valid: code === ADMIN_PASSWORD });
};
