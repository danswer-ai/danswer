@echo off
setlocal enabledelayedexpansion

REM Use the current directory as the repository path
set "REPO_PATH=%cd%"
set "UPSTREAM_REPO_URL=https://github.com/danswer-ai/danswer.git"
set "UPSTREAM_BRANCH=main"

REM Save the current directory and change to the repository path
pushd %REPO_PATH%

REM Check if upstream is set, if not, add it
git remote | findstr /C:"upstream" > nul
if errorlevel 1 (
    git remote add upstream %UPSTREAM_REPO_URL%
)

REM Fetch the latest changes from the upstream repository
git fetch upstream

REM Check for new commits
set "UPDATES_FOUND=0"
for /f "delims=" %%i in ('git log HEAD..upstream/%UPSTREAM_BRANCH% --oneline') do (
    set "UPDATES=%%i"
    set "UPDATES_FOUND=1"
)

if "%UPDATES_FOUND%"=="1" (
    echo New updates are available in the original repository:
    echo %UPDATES%
    set /p SYNC="Do you want to synchronize the updates? (yes/no): "
    if /I "!SYNC!"=="yes" (
        REM Check for unstaged changes
        git diff --exit-code --quiet
        if errorlevel 1 (
            echo error: cannot rebase: You have unstaged changes.
            echo error: Please commit or stash them.
            goto endScript
        ) else (
            REM Safe to proceed with rebase or merge
            git rebase upstream/%UPSTREAM_BRANCH%
            if errorlevel 1 (
                echo Error during rebase.
                goto endScript
            ) else (
                echo Synchronization complete.
            )
        )
    )
) else (
    echo Your repository is up to date with the upstream repository.
)

:endScript
REM Return to the original directory
popd
endlocal
