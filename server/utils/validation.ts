/**
 * Валидация и санитизация входных данных
 */

/**
 * Валидирует shareId - должен быть UUID формата
 */
export function validateShareId(shareId: string): boolean {
  // UUID v4 формат: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(shareId);
}

/**
 * Валидирует commit SHA - должен быть hex строкой длиной 40 символов
 */
export function validateCommitSha(sha: string): boolean {
  // Git commit SHA: 40 hex символов
  const shaRegex = /^[0-9a-f]{40}$/i;
  return shaRegex.test(sha);
}

/**
 * Валидирует и нормализует page number
 */
export function validatePage(page: number | undefined): number {
  if (page === undefined || isNaN(page) || page < 1) {
    return 1;
  }
  return Math.min(Math.floor(page), 1000); // Максимум 1000 страниц
}

/**
 * Валидирует и нормализует perPage
 */
export function validatePerPage(perPage: number | undefined): number {
  if (perPage === undefined || isNaN(perPage) || perPage < 1) {
    return 100;
  }
  return Math.min(Math.floor(perPage), 100); // Максимум 100 на страницу
}

/**
 * Валидирует и нормализует limit
 */
export function validateLimit(limit: number | undefined, defaultLimit: number = 10, maxLimit: number = 100): number {
  if (limit === undefined || isNaN(limit) || limit < 1) {
    return defaultLimit;
  }
  return Math.min(Math.floor(limit), maxLimit);
}

/**
 * Валидирует content - проверяет размер
 */
export function validateContent(content: string | undefined | null): { valid: boolean; error?: string } {
  if (content === undefined || content === null) {
    return { valid: false, error: 'Content is required' };
  }
  
  // Максимальный размер файла: 10MB (в base64 это будет ~13.3MB, но GitLab ограничивает размер файла)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (content.length > maxSize) {
    return { valid: false, error: 'Content is too large (max 10MB)' };
  }
  
  return { valid: true };
}

/**
 * Валидирует filename - проверяет на опасные символы
 */
export function validateFilename(filename: string | undefined): string {
  if (!filename || filename.trim() === '') {
    return 'share.json';
  }
  
  // Удаляем опасные символы и пути
  const sanitized = filename
    .replace(/[/\\?*|"<>:]/g, '') // Удаляем опасные символы
    .replace(/^\.+/, '') // Удаляем ведущие точки
    .trim();
  
  return sanitized || 'share.json';
}
