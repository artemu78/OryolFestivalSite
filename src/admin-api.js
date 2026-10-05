export const adminApiUrl =
  import.meta.env.VITE_ADMIN_API_URL ||
  (import.meta.env.DEV
    ? "/api/admin"
    : "https://functions.yandexcloud.net/d4e278ej3sclqe0bfsro");

export async function adminRequest(token, action = "list", data = {}) {
  if (!adminApiUrl) throw new Error("Сервис управления ещё не настроен");
  const headers = {
    "Content-Type": "application/json",
  };
  if (token && token !== "null" && token !== "undefined") {
    headers["X-VK-Token"] = `Bearer ${token}`;
  }
  const response = await fetch(adminApiUrl, {
    cache: "no-store",
    method: "POST",
    headers,
    body: JSON.stringify({ ...data, action }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Не удалось выполнить запрос");
  return result;
}
