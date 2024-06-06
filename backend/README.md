# Развёртывание питонячьей части без боли для дева, полностью локально
0. Ставим https://rye.astral.sh/ и (если у вас их нет) ноду и docker + docker compose.
1. Переходим в эту папку.
2. `rye sync`
3. Дублируем терминал (`ctrl + shift + T` по дефолту), делаем `cd ../deployment/docker_compose && docker compose -f docker-compose.dev.yml -p danswer-stack up index relational_db` чтобы поднять базы (`sudo` нужен для компоуза, если вам было лень нормально настроить права, как и мне...)
4. `rye run run_migrations` чтобы сделать миграции (один раз) и `rye run playwright install` чтобы web connector работал.
5. Дублируем терминал на каждую команду: `rye run model_server` чтобы запустить сервис с векторизовалками, `rye run background_tasks` чтобы обновлять индексы документами, `rye run main_server` - основной функционал.
6. `cd ../web/ && npm i && npm run dev` чтобы запустить веб-морду 
