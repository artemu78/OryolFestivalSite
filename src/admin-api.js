export const adminApiUrl = import.meta.env.VITE_ADMIN_API_URL || "https://functions.yandexcloud.net/d4e278ej3sclqe0bfsro";
export async function adminRequest(token, action, data = {}) {
  if (!adminApiUrl) throw new Error('Сервис управления ещё не настроен');
  const response = await fetch(adminApiUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-VK-Token': `Bearer ${token}` },
    body: JSON.stringify({ ...data, action }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Не удалось выполнить запрос');
  return result;
}
