# Развёртывание питонячьей части без боли для дева
1. Ставим https://rye.astral.sh/
2. `rye sync`
3. После запуска дбшек опираясь на инструкцию [Get Started with Contributing](../CONTRIBUTING.md#get-started-) прогнать миграции `rye run run_migrations`
4. `ry run main_server`, `ryen run background_tasks`, `rye run model_server`
