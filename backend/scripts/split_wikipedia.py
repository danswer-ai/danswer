import os
import shutil

batch_size = 50_000
base_path = "/Users/chrisweaver/Downloads/WikipediaStuff"
wikipedia_path = f"{base_path}/WikipediaProcessed"

file_names = os.listdir(wikipedia_path)

dir_num = 0
live_cnt = 0
for file_name in file_names:
    if live_cnt == 0:
        print("Creating batch with number", dir_num)
        path = f"{base_path}/WikipediaProcessed_{dir_num}"
        if not os.path.exists(path):
            os.mkdir(path)

    shutil.copy(
        f"{wikipedia_path}/{file_name}",
        f"{base_path}/WikipediaProcessed_{dir_num}/{file_name}",
    )
    live_cnt += 1

    if live_cnt == batch_size:
        live_cnt = 0
        dir_num += 1
