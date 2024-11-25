#!/bin/bash

# Number of recent branches to show
num_branches=5

# Get recent branches
recent_branches=$(git for-each-ref --sort=-committerdate --format='%(refname:short)' --count=$num_branches refs/heads/)

# Loop through recent branches
for branch in $recent_branches; do
    echo "Branch: $branch"
    echo "Last commit: $(git log -1 --pretty=format:"%cr" $branch)"
    
    # Get the number of commits ahead/behind master
    ahead_behind=$(git rev-list --left-right --count master...$branch)
    ahead=$(echo $ahead_behind | cut -f2 -d$'\t')
    behind=$(echo $ahead_behind | cut -f1 -d$'\t')
    
    echo "Commits ahead of master: $ahead"
    echo "Commits behind master: $behind"
    
    # Get the number of lines changed compared to master
    lines_changed=$(git diff --shortstat master...$branch)
    echo "Changes compared to master: $lines_changed"
    echo "----------------------------------------"
done
