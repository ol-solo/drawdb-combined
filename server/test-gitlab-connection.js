#!/usr/bin/env node
/**
 * Скрипт для проверки подключения к GitLab
 * Использование: node test-gitlab-connection.js
 */

require('dotenv').config();
const axios = require('axios');
const https = require('https');

const baseUrl = process.env.GITLAB_BASE_URL || 'https://gitlab.com';
const token = process.env.GITLAB_TOKEN;
const projectId = process.env.GITLAB_PROJECT_ID;

console.log('🔍 Проверка подключения к GitLab...\n');
console.log('Base URL:', baseUrl);
console.log('Project ID:', projectId);
console.log('Token present:', !!token);
console.log('Token length:', token ? token.length : 0);
console.log('');

if (!token) {
  console.error('❌ ОШИБКА: GITLAB_TOKEN не установлен в .env файле');
  process.exit(1);
}

if (!projectId) {
  console.error('❌ ОШИБКА: GITLAB_PROJECT_ID не установлен в .env файле');
  process.exit(1);
}

// Настройка axios для работы с самоподписанными сертификатами (если нужно)
const axiosConfig = {
  headers: {
    'PRIVATE-TOKEN': token,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  // Раскомментируйте следующую строку, если используете самоподписанный сертификат
  // httpsAgent: new https.Agent({ rejectUnauthorized: false }),
};

// Тест 1: Проверка доступности GitLab API
console.log('📡 Тест 1: Проверка доступности GitLab API...');
axios
  .get(`${baseUrl}/api/v4/version`, axiosConfig)
  .then((response) => {
    console.log('✅ GitLab API доступен!');
    console.log('   Версия GitLab:', response.data.version || 'неизвестна');
    console.log('');
    
    // Тест 2: Проверка доступа к проекту
    console.log('📦 Тест 2: Проверка доступа к проекту...');
    return axios.get(`${baseUrl}/api/v4/projects/${projectId}`, axiosConfig);
  })
  .then((response) => {
    console.log('✅ Доступ к проекту получен!');
    console.log('   Название проекта:', response.data.name);
    console.log('   Путь проекта:', response.data.path_with_namespace);
    console.log('   Видимость:', response.data.visibility || 'неизвестна');
    console.log('');
    
    // Тест 3: Проверка прав на запись
    console.log('✍️  Тест 3: Проверка прав на запись...');
    const testFilePath = `${process.env.SHARES_PATH_PREFIX || 'shares/'}test-connection-${Date.now()}.json`;
    const testContent = Buffer.from(JSON.stringify({ test: true, timestamp: new Date().toISOString() })).toString('base64');
    
    return axios.post(
      `${baseUrl}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(testFilePath)}`,
      {
        branch: process.env.GITLAB_REF || 'main',
        content: testContent,
        encoding: 'base64',
        commit_message: 'Test connection from DrawDB server',
      },
      axiosConfig
    );
  })
  .then((response) => {
    console.log('✅ Права на запись подтверждены!');
    console.log('   Тестовый файл создан');
    console.log('');
    
    // Удаляем тестовый файл
    const testFilePath = `${process.env.SHARES_PATH_PREFIX || 'shares/'}test-connection-${Date.now().toString().slice(0, -3)}.json`;
    console.log('🧹 Очистка: удаление тестового файла...');
    return axios.delete(
      `${baseUrl}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(testFilePath)}`,
      {
        ...axiosConfig,
        data: {
          branch: process.env.GITLAB_REF || 'main',
          commit_message: 'Cleanup test file',
        },
      }
    );
  })
  .then(() => {
    console.log('✅ Тестовый файл удален');
    console.log('');
    console.log('🎉 Все тесты пройдены успешно!');
    console.log('   Сервер готов к работе с GitLab.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ ОШИБКА подключения к GitLab:');
    console.error('');
    
    if (error.response) {
      // Сервер ответил с кодом ошибки
      console.error('   Статус:', error.response.status);
      console.error('   Сообщение:', error.response.data?.message || error.response.statusText);
      
      if (error.response.status === 401) {
        console.error('');
        console.error('   💡 Решение: Проверьте правильность GITLAB_TOKEN');
        console.error('      - Убедитесь, что токен не истёк');
        console.error('      - Проверьте, что токен имеет права read_repository и write_repository');
      } else if (error.response.status === 404) {
        console.error('');
        console.error('   💡 Решение: Проверьте правильность GITLAB_PROJECT_ID');
        console.error('      - Убедитесь, что проект существует');
        console.error('      - Проверьте, что токен имеет доступ к проекту');
      } else if (error.response.status === 403) {
        console.error('');
        console.error('   💡 Решение: Недостаточно прав');
        console.error('      - Убедитесь, что токен имеет права read_repository и write_repository');
      }
    } else if (error.request) {
      // Запрос был отправлен, но ответа не получено
      console.error('   Тип ошибки: Сетевая ошибка');
      console.error('   Код:', error.code);
      console.error('   Сообщение:', error.message);
      console.error('');
      
      if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
        console.error('   💡 Решение: Проблема с DNS или сетью');
        console.error('      - Проверьте, что домен доступен (ping git.dev.bi.zone)');
        console.error('      - Если это внутренний домен, добавьте его в /etc/hosts:');
        console.error('        sudo sh -c \'echo "IP_АДРЕС git.dev.bi.zone" >> /etc/hosts\'');
        console.error('      - Или подключитесь к VPN, если требуется');
        console.error('      - Или используйте IP-адрес вместо домена в GITLAB_BASE_URL');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('   💡 Решение: Сервер недоступен');
        console.error('      - Проверьте, что GitLab сервер запущен');
        console.error('      - Проверьте правильность URL в GITLAB_BASE_URL');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('   💡 Решение: Таймаут подключения');
        console.error('      - Проверьте сетевое подключение');
        console.error('      - Проверьте, не блокирует ли файрвол подключение');
      }
    } else {
      // Ошибка при настройке запроса
      console.error('   Ошибка:', error.message);
    }
    
    console.error('');
    process.exit(1);
  });
