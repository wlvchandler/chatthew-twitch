import json

class FileLoaded():
    def __init__(self, filename=None):
        self.filename = filename+'.json'
        self.load()

    def commit(self, filename=None, data=None):
        with open(self.filename, 'w', encoding='utf-8') as f:
            json.dump(self.filename, f, ensure_ascii=False, indent=4)

    def load(self):
        with open(self.filename, 'r') as f:
            self.loaded_data = json.load(f)
