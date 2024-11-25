#!/bin/bash

# Output CSV file
output_file="branch_commits.csv"

# Write CSV header
echo "Branch,Commit Hash,Author,Date,Subject" > "$output_file"

# Get all local branches except main
branches=$(git for-each-ref --format='%(refname:short)' refs/heads/ | grep -v '^main$')

# Loop through each branch
for branch in $branches; do
    # Get commits for the branch
    commits=$(git log main..$branch --pretty=format:"%H,%an,%ad,%s" --date=short)
    
    # If there are commits, add them to the CSV
    if [ ! -z "$commits" ]; then
        while IFS= read -r commit; do
            echo "$branch,$commit" >> "$output_file"
        done <<< "$commits"
    fi
done

echo "CSV file created: $output_file"
