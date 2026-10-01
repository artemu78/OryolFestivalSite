# Публикация через GitHub Pages

Workflow `.github/workflows/pages.yml` устанавливает зависимости из lock-файла, собирает приложение и публикует только папку `dist`. Запускается после push в `main` или вручную. Дополнительные секреты не нужны.

## Настройка GitHub

1. Открыть https://github.com/artemu78/OryolFestivalSite/settings/pages.
2. В **Build and deployment → Source** выбрать **GitHub Actions**. Предложенный GitHub шаблон создавать не нужно: workflow уже есть в проекте.
3. Закоммитить и отправить изменения в `main`.
4. В **Actions → Deploy to GitHub Pages** открыть запуск и дождаться успешных заданий `build` и `deploy`.
5. Если workflow был отправлен до включения Pages, после настройки открыть **Actions → Deploy to GitHub Pages → Run workflow → main → Run workflow**.

Ожидаемый адрес без собственного домена: https://artemu78.github.io/OryolFestivalSite/.

Если Pages недоступен, проверить тариф и видимость репозитория: GitHub Free поддерживает Pages для публичных репозиториев. Не менять видимость автоматически. Если Actions отключены, включить их в **Settings → Actions → General**; ограничения организации могут требовать помощи администратора.

## Пути файлов

`actions/configure-pages` сообщает путь сайта; workflow передаёт его в Vite через `PAGES_BASE_PATH`. Локальная разработка по-прежнему работает в корне `/`. Если будет настроен собственный домен, путь будет получен из настроек Pages при следующей сборке.

Локально проверить сборку под адрес репозитория:

```sh
PAGES_BASE_PATH=/OryolFestivalSite/ npm run build
PAGES_BASE_PATH=/OryolFestivalSite/ npm run preview
```

Открыть http://localhost:4173/OryolFestivalSite/.

Документация: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages и https://vite.dev/guide/static-deploy.html#github-pages.
