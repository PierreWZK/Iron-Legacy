/** Jeton de session du compte (localStorage). Lu par les salons de combat ; vide si déconnecté. */
const TOKEN_KEY = 'iron-legacy.token';

export function savedToken(): string {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}
