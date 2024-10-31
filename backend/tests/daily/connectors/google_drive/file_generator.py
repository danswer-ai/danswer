import os

documents_folder = os.path.expanduser("~/Documents")
for i in range(0, 60):
    file_name = f"file_{i}.txt"
    file_text = f"This is file {i}"
    file_path = os.path.join(documents_folder, file_name)
    if os.path.exists(file_path):
        os.remove(file_path)
    with open(file_path, "w") as file:
        file.write(file_text)
